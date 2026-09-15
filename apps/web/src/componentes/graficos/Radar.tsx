'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Grafico, eixo } from '@/componentes/Grafico';

/**
 * Radar dos provedores (§16): dispersão de crescimento × tamanho, com o
 * market share codificado no raio da bolha.
 *
 * O eixo de acessos é logarítmico porque o mercado é fortemente assimétrico —
 * em escala linear, todos os provedores exceto os dois maiores colapsam numa
 * faixa ilegível junto ao eixo.
 */
export function RadarProvedores({
  pontos,
  altura = 420,
}: {
  pontos: Array<{ nome: string; crescimento: number; acessos: number; marketShare: number }>;
  altura?: number;
}) {
  const opcao = useMemo<EChartsOption>(() => {
    const maiorShare = Math.max(...pontos.map((p) => p.marketShare), 1);
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0]! : params;
          const d = p.data as [number, number, number, string];
          return (
            `<b>${d[3]}</b><br/>Crescimento: ${d[0].toFixed(1)}%<br/>` +
            `Acessos: ${d[1].toLocaleString('pt-BR')}<br/>` +
            `Participação: ${d[2].toFixed(2)}%`
          );
        },
      },
      grid: { left: 8, right: 24, top: 24, bottom: 8, containLabel: true },
      xAxis: eixo({
        type: 'value',
        name: 'Crescimento 12 meses (%)',
        nameLocation: 'middle' as const,
        nameGap: 28,
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        axisLabel: { formatter: '{value}%', color: '#94a3b8' },
      }),
      yAxis: eixo({
        type: 'log',
        name: 'Acessos',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        axisLabel: {
          color: '#94a3b8',
          formatter: (v: number) =>
            v >= 1e6 ? `${(v / 1e6).toFixed(0)} mi` : `${(v / 1e3).toFixed(0)} mil`,
        },
      }),
      series: [
        {
          type: 'scatter',
          symbolSize: (d: unknown) =>
            8 + Math.sqrt((d as [number, number, number, string])[2] / maiorShare) * 36,
          itemStyle: { color: '#22d3ee', opacity: 0.55, borderColor: '#67e8f9' },
          data: pontos.map((p) => [p.crescimento, p.acessos, p.marketShare, p.nome]),
          // Linha vertical no zero: separa quem cresce de quem encolhe.
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#475569', type: 'dashed' },
            data: [{ xAxis: 0 }],
          },
        },
      ],
    };
  }, [pontos]);

  return (
    <Grafico
      opcao={opcao}
      altura={altura}
      descricao="Dispersão dos provedores: crescimento percentual no eixo horizontal, número de acessos em escala logarítmica no vertical, participação de mercado no tamanho da bolha."
    />
  );
}
