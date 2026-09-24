'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EChartsOption } from 'echarts';
import { Grafico } from '@/componentes/Grafico';
import { lerUltimaCidade } from '@/componentes/SeletorCidade';
import { MapaMunicipios } from '@/componentes/graficos/MapaMunicipios';
import type { MunicipioIndice } from '@/lib/dados';
import { inteiro } from '@/lib/formato';

/**
 * Mapa coroplético dos municípios do Rio de Janeiro (§18, §19, §32).
 *
 * A malha é carregada em tempo de execução, e não embutida no bundle: o
 * GeoJSON do IBGE tem alguns megabytes e penalizaria todas as páginas que não
 * usam mapa.
 *
 * Quando a malha não está disponível, o componente NÃO desenha formas
 * aproximadas — cai para o treemap, que representa a mesma informação sem
 * inventar geografia.
 *
 * A junção entre geometria e dados é feita pelo CÓDIGO IBGE, nunca pelo nome
 * do município: grafias divergem entre IBGE e Anatel ("Parati"/"Paraty",
 * acentuação inconsistente), e casar por nome perderia municípios em silêncio.
 */

type Metrica = 'densidade' | 'lentas' | 'provedores' | 'concentracao';

// Quatro métricas, todas comparáveis entre municípios de tamanhos diferentes.
// Total de acessos ficou de fora: só repete o tamanho da população.
const METRICAS: Record<
  Metrica,
  {
    rotulo: string;
    valor: (m: MunicipioIndice) => number | null;
    sufixo: string;
    casas: number;
    cores: string[];
    descricao: string;
  }
> = {
  densidade: {
    rotulo: 'Densidade',
    valor: (m) => m.densidade ?? null,
    sufixo: '',
    casas: 1,
    cores: ['#0c2d3a', '#0e5a70', '#0e7490', '#22d3ee', '#a5f3fc'],
    descricao: 'Acessos residenciais por 100 domicílios ocupados (IBGE, Censo 2022).',
  },
  lentas: {
    rotulo: 'Conexões lentas',
    valor: (m) => m.percentualAbaixo50 ?? null,
    sufixo: '%',
    casas: 1,
    cores: ['#1e3a4a', '#475569', '#9f5a6a', '#e11d48', '#fb7185'],
    descricao: 'Parcela dos acessos com velocidade contratada abaixo de 50 Mbps.',
  },
  provedores: {
    rotulo: 'Nº de provedores',
    valor: (m) => m.numeroProvedores,
    sufixo: '',
    casas: 0,
    cores: ['#0c2d3a', '#0e5a70', '#0e7490', '#22d3ee', '#a5f3fc'],
    descricao: 'Provedores com acessos registrados no município.',
  },
  concentracao: {
    rotulo: 'Concentração (HHI)',
    valor: (m) => m.hhi,
    sufixo: '',
    casas: 0,
    cores: ['#1e3a4a', '#475569', '#92702a', '#d97706', '#fbbf24'],
    descricao: 'Índice Herfindahl-Hirschman (0–10.000). Indicador estatístico, sem juízo de valor.',
  },
};

/**
 * Faixas por quantis: com escala linear, a capital (1,8 mi de acessos, ou
 * valores extremos) comprime todos os outros municípios na mesma cor.
 */
function faixasPorQuantil(valores: number[], cores: string[]) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const n = cores.length;
  const cortes: number[] = [];
  for (let k = 1; k < n; k++) {
    const c = ordenados[Math.floor((k * ordenados.length) / n)]!;
    if (cortes.length === 0 || c > cortes[cortes.length - 1]!) cortes.push(c);
  }
  const limites = [ordenados[0]!, ...cortes, ordenados[ordenados.length - 1]!];
  const faixas = [];
  for (let k = 0; k < limites.length - 1; k++) {
    const ultima = k === limites.length - 2;
    faixas.push({
      gte: limites[k]!,
      ...(ultima ? { lte: limites[k + 1]! } : { lt: limites[k + 1]! }),
      color: cores[Math.round((k * (n - 1)) / Math.max(1, limites.length - 2))]!,
    });
  }
  return faixas;
}

const NOME_MAPA = 'rj-municipios';

type Caixa = [number, number, number, number]; // minLon, minLat, maxLon, maxLat

/** Retângulo envolvente de cada município da malha, pelo código IBGE. */
function caixasDaMalha(malha: {
  features: Array<{ properties: { name: string }; geometry: { coordinates: unknown } }>;
}): Map<string, Caixa> {
  const caixas = new Map<string, Caixa>();
  for (const f of malha.features) {
    const c: Caixa = [Infinity, Infinity, -Infinity, -Infinity];
    const visitar = (v: unknown): void => {
      if (!Array.isArray(v)) return;
      if (typeof v[0] === 'number') {
        const [x, y] = v as [number, number];
        c[0] = Math.min(c[0], x); c[1] = Math.min(c[1], y);
        c[2] = Math.max(c[2], x); c[3] = Math.max(c[3], y);
      } else v.forEach(visitar);
    };
    visitar(f.geometry.coordinates);
    caixas.set(String(f.properties.name), c);
  }
  return caixas;
}
type Estado = 'carregando' | 'pronto' | 'indisponivel';

interface Props {
  municipios: MunicipioIndice[];
  /**
   * Município destacado (slug). Fixo na página do próprio município: um clique
   * em outra cidade navega até ela. Sem `destaque`, o mapa segue a última
   * cidade escolhida no seletor, e o clique troca o destaque.
   */
  destaque?: string;
}

export function MapaRJ({ municipios, destaque }: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [metrica, setMetrica] = useState<Metrica>('densidade');
  const [caixas, setCaixas] = useState<Map<string, Caixa> | null>(null);
  const [slugDestaque, setSlugDestaque] = useState<string | null>(destaque ?? null);
  const config = METRICAS[metrica];
  // Métricas sem nenhum valor (artefatos anteriores ao dado) não viram aba vazia.
  const metricasDisponiveis = (Object.keys(METRICAS) as Metrica[]).filter((k) =>
    municipios.some((m) => METRICAS[k].valor(m) !== null),
  );
  const destacado = municipios.find((m) => m.slug === slugDestaque) ?? null;
  const ordenados = useMemo(
    () =>
      municipios
        .filter((m) => config.valor(m) !== null)
        .sort((x, y) => (config.valor(y) as number) - (config.valor(x) as number)),
    [municipios, config],
  );
  const fmtValor = (m: MunicipioIndice) =>
    (config.valor(m) as number).toLocaleString('pt-BR', { maximumFractionDigits: config.casas }) +
    config.sufixo;
  const mediana = ordenados.length > 0 ? ordenados[Math.floor(ordenados.length / 2)]! : null;
  const posicao = destacado ? ordenados.findIndex((m) => m.slug === destacado.slug) : -1;

  useEffect(() => {
    if (!destaque) setSlugDestaque(lerUltimaCidade());
  }, [destaque]);

  // O ECharts registra o handler uma vez; a ref mantém o comportamento atual.
  const aoClicar = useRef<(codigo: string) => void>(() => {});
  aoClicar.current = (codigo) => {
    const m = municipios.find((x) => x.codigoIbge === codigo);
    if (!m) return;
    if (destaque) {
      if (m.slug !== destaque) router.push(`/municipios/${m.slug}/`);
    } else {
      setSlugDestaque((atual) => (atual === m.slug ? null : m.slug));
    }
  };

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const resposta = await fetch('/data/malhas/rj-municipios.json');
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const malha = await resposta.json();
        if (cancelado) return;

        const echartsModule = await import('echarts');
        const echarts = (echartsModule as any).registerMap ? echartsModule : (echartsModule as any).default;
        (echarts as any).registerMap(NOME_MAPA, malha);
        setCaixas(caixasDaMalha(malha));
        setEstado('pronto');
      } catch {
        if (!cancelado) setEstado('indisponivel');
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  const opcao = useMemo<EChartsOption>(() => {
    const porCodigo = new Map(municipios.map((m) => [m.codigoIbge, m]));
    const comValor = municipios.filter((m) => config.valor(m) !== null);
    const valores = comValor.map((m) => config.valor(m) as number);
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { maximumFractionDigits: config.casas }) + config.sufixo;
    // Zoom no município destacado, mantendo parte dos vizinhos à vista.
    let enquadramento: { center?: [number, number]; zoom: number } = { zoom: 1 };
    const caixa = destacado ? caixas?.get(destacado.codigoIbge) : undefined;
    if (caixa && caixas) {
      let e: Caixa = [Infinity, Infinity, -Infinity, -Infinity];
      for (const c of caixas.values())
        e = [Math.min(e[0], c[0]), Math.min(e[1], c[1]), Math.max(e[2], c[2]), Math.max(e[3], c[3])];
      const razao = Math.min((e[2] - e[0]) / (caixa[2] - caixa[0]), (e[3] - e[1]) / (caixa[3] - caixa[1]));
      enquadramento = {
        center: [(caixa[0] + caixa[2]) / 2, (caixa[1] + caixa[3]) / 2],
        zoom: Math.min(12, Math.max(1.5, razao * 0.45)),
      };
    }
    const faixas = valores.length > 0 ? faixasPorQuantil(valores, config.cores) : [];

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0]! : params;
          const codigo = String((p as { name?: string }).name ?? '');
          const m = porCodigo.get(codigo);
          if (!m) {
            // Município da malha sem acessos registrados na competência.
            return 'Sem acessos registrados nesta competência';
          }
          const valor = config.valor(m);
          return (
            `<b>${m.nome}</b><br/>` +
            `${config.rotulo}: <b>${
              valor === null
                ? 'n/d'
                : valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + config.sufixo
            }</b><br/>` +
            `Acessos: ${m.totalAcessos.toLocaleString('pt-BR')}<br/>` +
            `Provedores: ${m.numeroProvedores}<br/>` +
            `Líder: ${m.liderNome ?? 'n/d'}` +
            (m.liderMarketShare !== null
              ? ` (${m.liderMarketShare.toFixed(1)}%)`
              : '')
          );
        },
      },
      visualMap: {
        type: 'piecewise',
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        padding: 8,
        left: 8,
        bottom: 8,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        pieces: faixas.map((f) => ({
          ...f,
          label: `${fmt(f.gte)} – ${fmt('lte' in f ? f.lte! : f.lt!)}`,
        })),
      },
      series: [
        {
          type: 'map',
          map: NOME_MAPA,
          roam: true,
          ...enquadramento,
          animationDurationUpdate: 700,
          animationEasingUpdate: 'cubicInOut',
          // `nameProperty` garante a junção pelo código IBGE gravado em
          // properties.name durante o download da malha.
          nameProperty: 'name',
          label: { show: false },
          itemStyle: { borderColor: '#020617', borderWidth: 0.6, areaColor: '#1e293b' },
          emphasis: {
            label: { show: false },
            itemStyle: { areaColor: '#67e8f9', borderColor: '#f8fafc' },
          },
          select: { disabled: true },
          data: municipios.map((m) => {
            const valor = config.valor(m);
            const ehDestaque = destacado?.codigoIbge === m.codigoIbge;
            return {
              name: m.codigoIbge,
              value: valor ?? undefined,
              itemStyle: ehDestaque
                ? { borderColor: '#fbbf24', borderWidth: 2.5, opacity: 1 }
                : undefined,
              label: ehDestaque
                ? {
                    show: true,
                    formatter: m.nome,
                    color: '#f8fafc',
                    fontWeight: 'bold',
                    fontSize: 12,
                    textBorderColor: '#020617',
                    textBorderWidth: 3,
                  }
                : undefined,
            };
          }),
        },
      ],
    };
  }, [municipios, config, destacado, caixas]);

  if (estado === 'indisponivel') {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-grafite-700 bg-grafite-900/60 p-3 text-xs text-grafite-400">
          <strong className="text-grafite-300">Malha geográfica não carregada.</strong>{' '}
          Exibindo a distribuição por área proporcional em vez do mapa. Para habilitar
          o mapa do Estado, rode <code className="text-marca-300">npm run etl -- malhas</code>.
        </p>
        <MapaMunicipios municipios={municipios} />
      </div>
    );
  }

  if (estado === 'carregando') {
    return (
      <div className="flex h-[520px] items-center justify-center text-sm text-grafite-500">
        Carregando malha do Estado…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        {metricasDisponiveis.map((chave) => (
          <button
            key={chave}
            type="button"
            onClick={() => setMetrica(chave)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              metrica === chave
                ? 'bg-grafite-700 text-white'
                : 'text-grafite-400 hover:bg-grafite-800 hover:text-white'
            }`}
          >
            {METRICAS[chave].rotulo}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-grafite-500">{config.descricao}</p>
        {destacado && !destaque && (
          <button
            type="button"
            onClick={() => setSlugDestaque(null)}
            className="rounded-md border border-grafite-700 px-2 py-1 text-xs text-grafite-300 hover:text-white"
          >
            Ver Estado inteiro
          </button>
        )}
      </div>

      {destacado && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm">
          <span className="font-semibold text-white">{destacado.nome}</span>
          <span className="text-grafite-300">{inteiro(destacado.totalAcessos)} acessos</span>
          <span className="text-grafite-300">{destacado.numeroProvedores} provedores</span>
          {destacado.liderNome && (
            <span className="text-grafite-300">
              Líder: {destacado.liderNome}
              {destacado.liderMarketShare !== null && ` (${destacado.liderMarketShare.toFixed(1)}%)`}
            </span>
          )}
          {destacado.hhi !== null && <span className="text-grafite-300">HHI {inteiro(destacado.hhi)}</span>}
          {!destaque && (
            <span className="ml-auto flex gap-3">
              <Link href={`/municipios/${destacado.slug}/`} className="text-marca-300 hover:underline">
                Ver município →
              </Link>
              <button type="button" onClick={() => setSlugDestaque(null)} className="text-grafite-400 hover:text-white">
                Limpar destaque
              </button>
            </span>
          )}
        </div>
      )}

      <Grafico
        opcao={opcao}
        altura={520}
        descricao={
          `Mapa dos municípios do Rio de Janeiro colorido por ${config.rotulo}` +
          (destacado ? `, com ${destacado.nome} em destaque.` : '.')
        }
        aoCriar={(grafico) =>
          grafico.on('click', (p: { name?: string }) => p.name && aoClicar.current(String(p.name)))
        }
      />

      {ordenados.length > 0 && (
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-grafite-800 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-grafite-500">Maiores valores</p>
            <ol className="space-y-1">
              {ordenados.slice(0, 5).map((m, i) => (
                <li key={m.slug} className="flex justify-between gap-2">
                  <Link href={`/municipios/${m.slug}/`} className="text-grafite-300 hover:text-white">
                    {i + 1}. {m.nome}
                  </Link>
                  <span className="tabular-nums text-grafite-400">{fmtValor(m)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-grafite-800 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-grafite-500">Menores valores</p>
            <ol className="space-y-1">
              {ordenados.slice(-5).reverse().map((m, i) => (
                <li key={m.slug} className="flex justify-between gap-2">
                  <Link href={`/municipios/${m.slug}/`} className="text-grafite-300 hover:text-white">
                    {ordenados.length - i}. {m.nome}
                  </Link>
                  <span className="tabular-nums text-grafite-400">{fmtValor(m)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-grafite-800 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-grafite-500">
              {destacado && posicao >= 0 ? destacado.nome : 'Referência'}
            </p>
            {destacado && posicao >= 0 && (
              <p className="text-2xl font-bold text-white tabular-nums">
                {fmtValor(destacado)}
                <span className="ml-2 text-sm font-normal text-grafite-400">
                  {posicao + 1}º de {ordenados.length}
                </span>
              </p>
            )}
            {mediana && (
              <p className="mt-1 text-grafite-400">
                Mediana dos municípios: <span className="tabular-nums text-grafite-200">{fmtValor(mediana)}</span>
              </p>
            )}
            {!destacado && (
              <p className="mt-1 text-xs text-grafite-500">Clique num município para ver a posição dele.</p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-grafite-500">
        {destaque
          ? 'Clique em outro município para abrir a página dele.'
          : 'Clique em um município para destacá-lo. O destaque segue a última cidade escolhida no seletor.'}
      </p>

      <p className="text-xs text-grafite-600">
        Malha municipal: IBGE. Municípios sem acessos registrados na competência
        aparecem sem preenchimento. Junção pelo código IBGE.
      </p>
    </div>
  );
}
