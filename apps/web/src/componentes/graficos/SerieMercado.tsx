'use client';

import { useMemo } from 'react';
import { rotularCompetencia } from '@netrank/core';
import type { EChartsOption } from 'echarts';
import { Grafico, eixo } from '@/componentes/Grafico';
import type { PontoSerie } from '@/lib/dados';

/** Evolução do total de acessos do Estado, com o nº de provedores no eixo oposto. */
export function SerieMercado({ serie, altura = 300 }: { serie: PontoSerie[]; altura?: number }) {
  const opcao = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#94a3b8' }, top: 0 },
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      xAxis: eixo({
        type: 'category',
        data: serie.map((p) => rotularCompetencia(p.competencia)),
        boundaryGap: false,
      }),
      yAxis: [
        eixo({
          type: 'value',
          name: 'Acessos',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 11,
            formatter: (v: number) =>
              v >= 1e6 ? `${(v / 1e6).toFixed(1)} mi` : `${(v / 1e3).toFixed(0)} mil`,
          },
        }),
        eixo({
          type: 'value',
          name: 'Provedores',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          splitLine: { show: false },
        }),
      ],
      series: [
        {
          name: 'Total de acessos',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5 },
          areaStyle: { opacity: 0.12 },
          data: serie.map((p) => p.totalAcessos),
        },
        {
          name: 'Nº de provedores',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, type: 'dashed' },
          data: serie.map((p) => p.numeroProvedores),
        },
      ],
    }),
    [serie],
  );

  return (
    <Grafico
      opcao={opcao}
      altura={altura}
      descricao="Evolução mensal do total de acessos de banda larga fixa no Rio de Janeiro e do número de provedores ativos."
    />
  );
}
