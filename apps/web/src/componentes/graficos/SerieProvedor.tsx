'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { rotularCompetencia } from '@netrank/core';
import { Grafico, eixo } from '@/componentes/Grafico';
import type { PerfilProvedor } from '@/lib/dados';

/** Acessos e posição no ranking estadual do provedor, mês a mês. */
export function SerieProvedor({ serie }: { serie: PerfilProvedor['serie'] }) {
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
          name: 'Posição',
          // Invertido: subir no gráfico é melhorar de posição.
          inverse: true,
          minInterval: 1,
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          splitLine: { show: false },
          axisLabel: { color: '#94a3b8', fontSize: 11, formatter: '{value}º' },
        }),
      ],
      series: [
        {
          name: 'Acessos',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5 },
          areaStyle: { opacity: 0.12 },
          data: serie.map((p) => p.acessos),
        },
        {
          name: 'Posição no ranking',
          type: 'line',
          yAxisIndex: 1,
          step: 'end',
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 1.5, type: 'dashed' },
          data: serie.map((p) => p.posicao),
        },
      ],
    }),
    [serie],
  );

  return (
    <Grafico
      opcao={opcao}
      altura={300}
      descricao="Evolução mensal dos acessos do provedor e de sua posição no ranking estadual."
    />
  );
}

/** Municípios atendidos e liderados ao longo do tempo (§25). */
export function TerritorioProvedor({
  territorio,
}: {
  territorio: PerfilProvedor['territorio'];
}) {
  const opcao = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#94a3b8' }, top: 0 },
      grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
      xAxis: eixo({
        type: 'category',
        data: territorio.map((p) => rotularCompetencia(p.competencia)),
      }),
      yAxis: eixo({ type: 'value', minInterval: 1 }),
      series: [
        {
          name: 'Municípios atendidos',
          type: 'bar',
          itemStyle: { color: '#22d3ee', borderRadius: [3, 3, 0, 0] },
          data: territorio.map((p) => p.municipiosAtendidos),
        },
        {
          name: 'Municípios liderados',
          type: 'bar',
          itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] },
          data: territorio.map((p) => p.municipiosLiderados),
        },
      ],
    }),
    [territorio],
  );

  return (
    <Grafico
      opcao={opcao}
      altura={300}
      descricao="Número de municípios atendidos e liderados pelo provedor ao longo dos meses."
    />
  );
}
