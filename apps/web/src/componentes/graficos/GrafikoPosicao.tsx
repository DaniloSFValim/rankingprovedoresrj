'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { rotularCompetencia } from '@netrank/core';
import { Grafico } from '@/componentes/Grafico';
import type { PerfilProvedor } from '@/lib/dados';

export function GrafikoPosicao({ serie }: { serie: PerfilProvedor['serie'] }) {
  const opcao = useMemo<EChartsOption>(() => {
    const rotulos = serie.map((s) => rotularCompetencia(s.competencia));
    const posicoes = serie.map((s) => (s.posicao ? s.posicao : null));

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          type Item = { axisValueLabel?: string; marker?: string; seriesName?: string; value?: unknown };
          const lista = (Array.isArray(params) ? params : [params]) as Item[];
          const cabecalho = lista[0]?.axisValueLabel ?? '';
          const linhas = lista
            .filter((p) => p.value !== null && p.value !== undefined)
            .map((p) => `${p.marker ?? ''} ${p.seriesName ?? ''}: <b>${p.value}º</b>`);
          return `${cabecalho}<br/>${linhas.join('<br/>')}`;
        },
      },
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: rotulos,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        inverse: true,
        min: 1,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, formatter: '{value}º' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          name: 'Posição',
          type: 'line',
          data: posicoes,
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.5, color: '#06b6d4' },
          itemStyle: { color: '#22d3ee', borderColor: '#0891b2', borderWidth: 2 },
          emphasis: { focus: 'series', lineStyle: { width: 3.5 } },
          areaStyle: { color: 'rgba(6, 182, 212, 0.1)' },
          markPoint: {
            data: [
              { type: 'max', name: 'Melhor posição', symbol: 'diamond' },
              { type: 'min', name: 'Pior posição', symbol: 'diamond' },
            ],
            itemStyle: { color: '#fbbf24' },
            label: { formatter: '{b}: {c}º', color: '#fbbf24', fontSize: 10 },
          },
        },
      ],
    };
  }, [serie]);

  return (
    <Grafico
      opcao={opcao}
      altura={300}
      descricao="Variação da posição no ranking estadual ao longo dos meses. Eixo Y invertido: posição 1 no topo como em um pódio."
    />
  );
}
