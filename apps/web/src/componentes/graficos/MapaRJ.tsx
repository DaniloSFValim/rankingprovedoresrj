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

type Metrica = 'acessos' | 'densidade' | 'lentas' | 'provedores' | 'concentracao' | 'lider' | 'crescimento';

const METRICAS: Record<
  Metrica,
  {
    rotulo: string;
    valor: (m: MunicipioIndice) => number | null;
    sufixo: string;
    cores: string[];
    descricao: string;
  }
> = {
  acessos: {
    rotulo: 'Acessos',
    valor: (m) => m.totalAcessos,
    sufixo: '',
    cores: ['#0c2d3a', '#0e7490', '#22d3ee', '#a5f3fc'],
    descricao: 'Total de acessos de banda larga fixa no município.',
  },
  densidade: {
    rotulo: 'Densidade',
    valor: (m) => m.densidade ?? null,
    sufixo: '',
    cores: ['#0c2d3a', '#0e7490', '#22d3ee', '#a5f3fc'],
    descricao:
      'Acessos residenciais (pessoa física) por 100 domicílios ocupados — IBGE, Censo 2022.',
  },
  lentas: {
    rotulo: 'Conexões lentas',
    valor: (m) => m.percentualAbaixo50 ?? null,
    sufixo: '%',
    cores: ['#0e7490', '#64748b', '#f43f5e'],
    descricao: 'Parcela dos acessos com velocidade contratada abaixo de 50 Mbps.',
  },
  provedores: {
    rotulo: 'Nº de provedores',
    valor: (m) => m.numeroProvedores,
    sufixo: '',
    cores: ['#0c2d3a', '#0e7490', '#22d3ee', '#a5f3fc'],
    descricao: 'Quantidade de provedores com acessos registrados no município.',
  },
  concentracao: {
    rotulo: 'HHI',
    valor: (m) => m.hhi,
    sufixo: '',
    cores: ['#0e7490', '#64748b', '#f59e0b'],
    descricao:
      'Índice Herfindahl-Hirschman municipal (0–10.000). Indicador estatístico de ' +
      'concentração, apresentado sem juízo de valor.',
  },
  lider: {
    rotulo: 'Participação do líder',
    valor: (m) => m.liderMarketShare,
    sufixo: '%',
    cores: ['#0e7490', '#64748b', '#f59e0b'],
    descricao: 'Fatia de mercado do maior provedor do município.',
  },
  crescimento: {
    rotulo: 'Crescimento 12 meses',
    valor: (m) => m.variacao12Meses?.percentual ?? null,
    sufixo: '%',
    cores: ['#f43f5e', '#64748b', '#10b981'],
    descricao: 'Variação percentual do total de acessos em 12 meses.',
  },
};

const NOME_MAPA = 'rj-municipios';
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
  const [metrica, setMetrica] = useState<Metrica>('acessos');
  const [slugDestaque, setSlugDestaque] = useState<string | null>(destaque ?? null);
  const config = METRICAS[metrica];
  // Métricas sem nenhum valor (artefatos anteriores ao dado) não viram aba vazia.
  const metricasDisponiveis = (Object.keys(METRICAS) as Metrica[]).filter((k) =>
    municipios.some((m) => METRICAS[k].valor(m) !== null),
  );
  const destacado = municipios.find((m) => m.slug === slugDestaque) ?? null;

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
    const minimo = valores.length > 0 ? Math.min(...valores) : 0;
    const maximo = valores.length > 0 ? Math.max(...valores) : 1;

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
        min: minimo,
        max: maximo,
        left: 8,
        bottom: 8,
        calculable: true,
        text: ['maior', 'menor'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        inRange: { color: config.cores },
      },
      series: [
        {
          type: 'map',
          map: NOME_MAPA,
          roam: true,
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
                : destacado
                  ? { opacity: 0.35 }
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
  }, [municipios, config, destacado]);

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

      <p className="text-xs text-grafite-500">{config.descricao}</p>

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
