'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Grafico, eixo } from '@/componentes/Grafico';

/**
 * Participação de mercado em barras horizontais (§11).
 *
 * Barras horizontais em vez de pizza: comparar comprimentos é mais preciso
 * que comparar ângulos, e o nome do provedor cabe sem rotação.
 */
export function BarrasShare({
  itens,
  altura,
}: {
  itens: Array<{ nome: string; marketShare: number }>;
  altura?: number;
}) {
  const ordenados = useMemo(() => [...itens].reverse(), [itens]);
  const opcao = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0]! : params;
          return `${p.name}<br/><b>${Number(p.value).toFixed(2)}%</b> do mercado`;
        },
      },
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: eixo({ type: 'value', axisLabel: { formatter: '{value}%', color: '#94a3b8' } }),
      yAxis: eixo({
        type: 'category',
        data: ordenados.map((i) => i.nome),
        axisLabel: { color: '#cbd5e1', fontSize: 11, width: 180, overflow: 'truncate' },
        splitLine: { show: false },
      }),
      series: [
        {
          type: 'bar',
          data: ordenados.map((i) => i.marketShare),
          itemStyle: { color: '#22d3ee', borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            color: '#94a3b8',
            fontSize: 11,
            formatter: (p) => `${Number(p.value).toFixed(1)}%`,
          },
        },
      ],
    }),
    [ordenados],
  );

  return (
    <Grafico
      opcao={opcao}
      altura={altura ?? Math.max(200, ordenados.length * 28 + 40)}
      descricao="Participação de mercado dos maiores provedores de banda larga fixa no Rio de Janeiro."
    />
  );
}
