'use client';

import { useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { Grafico } from '@/componentes/Grafico';
import { MapaMunicipios } from '@/componentes/graficos/MapaMunicipios';
import type { MunicipioIndice } from '@/lib/dados';

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

type Metrica = 'acessos' | 'provedores' | 'concentracao' | 'lider' | 'crescimento';

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

export function MapaRJ({ municipios }: { municipios: MunicipioIndice[] }) {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [metrica, setMetrica] = useState<Metrica>('acessos');
  const config = METRICAS[metrica];

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const resposta = await fetch('/data/malhas/rj-municipios.json');
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const malha = await resposta.json();
        if (cancelado) return;
        echarts.registerMap(NOME_MAPA, malha);
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
          data: comValor.map((m) => ({
            name: m.codigoIbge,
            value: config.valor(m) as number,
          })),
        },
      ],
    };
  }, [municipios, config]);

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
        {(Object.keys(METRICAS) as Metrica[]).map((chave) => (
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

      <Grafico
        opcao={opcao}
        altura={520}
        descricao={`Mapa dos municípios do Rio de Janeiro colorido por ${config.rotulo}.`}
      />

      <p className="text-xs text-grafite-600">
        Malha municipal: IBGE. Municípios sem acessos registrados na competência
        aparecem sem preenchimento. Junção pelo código IBGE.
      </p>
    </div>
  );
}
