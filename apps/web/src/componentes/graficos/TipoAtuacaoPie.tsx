'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Grafico } from '@/componentes/Grafico';

/**
 * Distribuição de provedores por tipo de atuação (Operadora, Provedor, Ambos, Indefinido).
 */
export function TipoAtuacaoPie({
  provedores,
  altura = 300,
}: {
  provedores: Array<{ tipoAtuacao?: string }>;
  altura?: number;
}) {
  const opcao = useMemo<EChartsOption>(() => {
    const distribuicao: Record<string, number> = {
      OPERADORA: 0,
      PROVEDOR: 0,
      AMBOS: 0,
      INDEFINIDO: 0,
    };

    provedores.forEach((p) => {
      const tipo = p.tipoAtuacao || 'INDEFINIDO';
      if (tipo in distribuicao) {
        distribuicao[tipo]++;
      }
    });

    const rotulos: Record<string, string> = {
      OPERADORA: 'Operadora',
      PROVEDOR: 'Provedor',
      AMBOS: 'Operadora e Provedor',
      INDEFINIDO: 'Indefinido',
    };

    const cores: Record<string, string> = {
      OPERADORA: '#b5832a',
      PROVEDOR: '#1e7b4c',
      AMBOS: '#0e7482',
      INDEFINIDO: '#56626e',
    };

    const dados = Object.entries(distribuicao)
      .filter(([, valor]) => valor > 0)
      .map(([tipo, valor]) => ({
        name: rotulos[tipo],
        value: valor,
        tipo,
      }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = params as any;
          const total = provedores.length;
          const percentual = ((p.value / total) * 100).toFixed(1);
          return `${p.name}<br/><b>${p.value}</b> provedores (${percentual}%)`;
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['0%', '85%'],
          avoidLabelOverlap: false,
          data: dados,
          itemStyle: {
            color: (params) => cores[dados[params.dataIndex]?.tipo] || '#56626e',
          },
          label: {
            show: true,
            formatter: '{b}: {c}',
            fontSize: 11,
            color: '#1f2a35',
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0)',
            },
          },
        },
      ],
    };
  }, [provedores]);

  return (
    <Grafico
      opcao={opcao}
      altura={altura}
      descricao="Distribuição de provedores por tipo de atuação (Operadora, Provedor, Ambos, Indefinido)."
    />
  );
}
