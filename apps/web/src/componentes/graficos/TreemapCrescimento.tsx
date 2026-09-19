'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Grafico } from '@/componentes/Grafico';

export function TreemapCrescimento({
  pontos,
  altura = 420,
}: {
  pontos: Array<{ nome: string; crescimento: number; acessos: number; marketShare: number }>;
  altura?: number;
}) {
  const opcao = useMemo<EChartsOption>(() => {
    const minCrescimento = Math.min(...pontos.map((p) => p.crescimento));
    const maxCrescimento = Math.max(...pontos.map((p) => p.crescimento));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = params as any;
          return (
            `<b>${p.data.nome}</b><br/>` +
            `Acessos: ${p.data.acessos.toLocaleString('pt-BR')}<br/>` +
            `Crescimento 12m: ${p.data.crescimento.toFixed(1)}%<br/>` +
            `Market Share: ${p.data.marketShare.toFixed(2)}%`
          );
        },
      },
      series: [
        {
          type: 'treemap',
          data: pontos.map((p) => ({
            name: p.nome,
            value: p.acessos,
            acessos: p.acessos,
            crescimento: p.crescimento,
            marketShare: p.marketShare,
            nome: p.nome,
          })),
          roam: false,
          label: {
            show: true,
            formatter: '{b}' as const,
            fontSize: 11,
            color: '#f8fafc',
          },
          itemStyle: {
            borderColor: '#1e293b',
            borderWidth: 2,
          },
          visualMap: {
            type: 'continuous',
            min: minCrescimento,
            max: maxCrescimento,
            inRange: {
              color: ['#991b1b', '#fee2e2', '#dcfce7', '#22863a'],
            },
            textStyle: {
              color: '#cbd5e1',
            },
            orient: 'vertical',
            right: 10,
            top: 'center',
          },
          levels: [
            {
              itemStyle: {
                borderWidth: 0,
                gapWidth: 5,
              },
              label: {
                show: false,
              },
            },
          ],
        },
      ],
    };
  }, [pontos]);

  return (
    <Grafico
      opcao={opcao}
      altura={altura}
      descricao="Tamanho dos blocos representa número de acessos, cores representam crescimento (verde = crescimento, vermelho = queda)."
    />
  );
}
