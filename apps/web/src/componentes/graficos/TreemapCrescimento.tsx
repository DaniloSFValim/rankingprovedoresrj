'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Grafico } from '@/componentes/Grafico';
import { TETO_CRESCIMENTO, corCrescimento, corTextoCrescimento } from '@/lib/corCrescimento';

/**
 * Treemap: área = acessos, cor = crescimento no período.
 *
 * A cor de cada bloco é calculada aqui, e não por visualMap: o visualMap
 * colocado dentro da série é ignorado pelo ECharts, que então pintava cada
 * provedor com a paleta de categorias e a legenda verde/vermelho mentia.
 */
export function TreemapCrescimento({
  pontos,
  periodo,
  teto = TETO_CRESCIMENTO,
  altura = 420,
}: {
  pontos: Array<{ nome: string; crescimento: number; acessos: number; marketShare: number }>;
  /** Como o período aparece no texto: "no mês", "em 12 meses". */
  periodo: string;
  /** Variação (pontos percentuais) a partir da qual a cor fica plena. */
  teto?: number;
  altura?: number;
}) {
  const opcao = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const p = (params as any).data;
        const sinal = p.crescimento > 0 ? '+' : '';
        return (
          `<b>${p.nome}</b><br/>` +
          `Acessos: ${p.acessos.toLocaleString('pt-BR')}<br/>` +
          `Variação ${periodo}: ${sinal}${p.crescimento.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%<br/>` +
          `Participação: ${p.marketShare.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
        );
      },
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        data: pontos.map((p) => ({
          name: p.nome,
          value: p.acessos,
          acessos: p.acessos,
          crescimento: p.crescimento,
          marketShare: p.marketShare,
          nome: p.nome,
          itemStyle: { color: corCrescimento(p.crescimento, teto) },
          label: { color: corTextoCrescimento(p.crescimento, teto) },
        })),
        label: { show: true, formatter: '{b}', fontSize: 11 },
        itemStyle: { borderColor: '#ffffff', borderWidth: 2, gapWidth: 2 },
      },
    ],
  }), [pontos, periodo, teto]);

  return (
    <div>
      <Grafico
        opcao={opcao}
        altura={altura}
        descricao={`Área de cada bloco proporcional aos acessos; cor pela variação ${periodo}: verde para alta, vermelho para queda, cinza perto de zero.`}
      />
      <Legenda teto={teto} />
    </div>
  );
}

function Legenda({ teto }: { teto: number }) {
  const passos = [-teto, -teto / 2, 0, teto / 2, teto];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-grafite-400" aria-hidden="true">
      <span>Queda</span>
      <span className="flex">
        {passos.map((v) => (
          <span key={v} className="inline-block h-2.5 w-8" style={{ background: corCrescimento(v, teto) }} />
        ))}
      </span>
      <span>Alta</span>
      <span>(cor plena a partir de ±{teto}%)</span>
    </div>
  );
}
