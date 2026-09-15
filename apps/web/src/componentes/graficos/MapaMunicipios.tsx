'use client';

import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { Grafico } from '@/componentes/Grafico';
import type { MunicipioIndice } from '@/lib/dados';

/**
 * Mapa de calor dos municípios (§32), com métrica alternável.
 *
 * NOTA DE HONESTIDADE — por que treemap e não coroplético:
 * um mapa coroplético exige a malha geográfica dos municípios do RJ (GeoJSON
 * do IBGE), que ainda não foi incorporada ao pipeline. Em vez de desenhar
 * formas aproximadas — que seriam dado inventado —, a distribuição é
 * representada por área proporcional aos acessos e cor pela métrica escolhida.
 *
 * A leitura analítica é equivalente (tamanho = mercado, cor = indicador) e o
 * componente de mapa geográfico pode substituí-lo sem alterar os dados.
 */

type Metrica = 'acessos' | 'provedores' | 'concentracao' | 'lider' | 'crescimento';

const METRICAS: Record<
  Metrica,
  {
    rotulo: string;
    valor: (m: MunicipioIndice) => number | null;
    sufixo: string;
    /** Rampa do menor ao maior valor. */
    cores: [string, string];
    descricao: string;
  }
> = {
  acessos: {
    rotulo: 'Acessos',
    valor: (m) => m.totalAcessos,
    sufixo: '',
    cores: ['#164e63', '#67e8f9'],
    descricao: 'Total de acessos de banda larga fixa no município.',
  },
  provedores: {
    rotulo: 'Nº de provedores',
    valor: (m) => m.numeroProvedores,
    sufixo: '',
    cores: ['#164e63', '#67e8f9'],
    descricao: 'Quantidade de provedores com acessos registrados no município.',
  },
  concentracao: {
    rotulo: 'HHI',
    valor: (m) => m.hhi,
    sufixo: '',
    cores: ['#0e7490', '#f59e0b'],
    descricao:
      'Índice Herfindahl-Hirschman municipal (0–10.000). Indicador estatístico ' +
      'de concentração, sem juízo de valor.',
  },
  lider: {
    rotulo: 'Participação do líder',
    valor: (m) => m.liderMarketShare,
    sufixo: '%',
    cores: ['#0e7490', '#f59e0b'],
    descricao: 'Fatia de mercado do maior provedor do município.',
  },
  crescimento: {
    rotulo: 'Crescimento 12 meses',
    valor: (m) => m.variacao12Meses?.percentual ?? null,
    sufixo: '%',
    cores: ['#f43f5e', '#10b981'],
    descricao: 'Variação percentual do total de acessos em 12 meses.',
  },
};

export function MapaMunicipios({ municipios }: { municipios: MunicipioIndice[] }) {
  const [metrica, setMetrica] = useState<Metrica>('acessos');
  const config = METRICAS[metrica];

  const opcao = useMemo<EChartsOption>(() => {
    const comValor = municipios.filter((m) => config.valor(m) !== null);
    const valores = comValor.map((m) => config.valor(m) as number);
    const minimo = Math.min(...valores, 0);
    const maximo = Math.max(...valores, 1);

    return {
      tooltip: {
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0]! : params;
          const dados = (p as { data?: { nome?: string; metrica?: number | null; acessos?: number; provedores?: number; lider?: string | null } }).data;
          if (!dados) return '';
          return (
            `<b>${dados.nome}</b><br/>` +
            `${config.rotulo}: <b>${dados.metrica === null || dados.metrica === undefined ? 'n/d' : dados.metrica.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${config.sufixo}</b><br/>` +
            `Acessos: ${(dados.acessos ?? 0).toLocaleString('pt-BR')}<br/>` +
            `Provedores: ${dados.provedores ?? 0}<br/>` +
            `Líder: ${dados.lider ?? 'n/d'}`
          );
        },
      },
      visualMap: {
        min: minimo,
        max: maximo,
        dimension: 0,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        calculable: true,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        inRange: { color: config.cores },
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          top: 8,
          bottom: 48,
          left: 0,
          right: 0,
          label: {
            show: true,
            formatter: '{b}',
            color: '#f8fafc',
            fontSize: 11,
            overflow: 'truncate',
          },
          itemStyle: { borderColor: '#020617', borderWidth: 2, gapWidth: 2 },
          data: comValor.map((m) => ({
            name: m.nome,
            // O valor do treemap define a AREA (acessos); a cor vem do visualMap.
            value: [config.valor(m) as number, m.totalAcessos],
            nome: m.nome,
            metrica: config.valor(m),
            acessos: m.totalAcessos,
            provedores: m.numeroProvedores,
            lider: m.liderNome,
          })),
        },
      ],
    };
  }, [municipios, config]);

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

      <p className="text-xs text-grafite-500">
        Área proporcional ao número de acessos · Cor conforme {config.rotulo.toLowerCase()}.{' '}
        {config.descricao}
      </p>

      <Grafico
        opcao={opcao}
        altura={460}
        descricao={`Distribuição dos municípios do Rio de Janeiro por número de acessos, colorida por ${config.rotulo}.`}
      />
    </div>
  );
}
