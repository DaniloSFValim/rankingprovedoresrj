'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/**
 * Invólucro do ECharts com o tema do produto.
 *
 * A paleta de séries é fixa e ordenada por contraste entre categorias
 * adjacentes (§43): a cor identifica a série, não decora o gráfico.
 */
export const PALETA_SERIES = [
  '#22d3ee', '#a78bfa', '#f59e0b', '#34d399', '#f472b6',
  '#60a5fa', '#fb923c', '#4ade80', '#e879f9', '#2dd4bf',
] as const;

const BASE: echarts.EChartsOption = {
  color: [...PALETA_SERIES],
  backgroundColor: 'transparent',
  textStyle: { fontFamily: 'var(--fonte-sans)', color: '#cbd5e1' },
  grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
  tooltip: {
    backgroundColor: 'rgba(2,6,23,0.95)',
    borderColor: '#334155',
    textStyle: { color: '#e2e8f0' },
  },
};

const EIXO_ESCURO = {
  axisLine: { lineStyle: { color: '#334155' } },
  axisLabel: { color: '#94a3b8', fontSize: 11 },
  splitLine: { lineStyle: { color: '#1e293b' } },
};

/** Aplica o estilo de eixo do tema sem sobrescrever ajustes da chamada. */
export function eixo(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...EIXO_ESCURO, ...extra };
}

interface Props {
  opcao: echarts.EChartsOption;
  altura?: number;
  /** Rótulo lido por leitores de tela, já que o canvas não é acessível. */
  descricao: string;
  aoCriar?: (instancia: echarts.ECharts) => void;
}

export function Grafico({ opcao, altura = 320, descricao, aoCriar }: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const instancia = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!elemento.current) return;
    const grafico = echarts.init(elemento.current, undefined, { renderer: 'canvas' });
    instancia.current = grafico;
    grafico.setOption({ ...BASE, ...opcao });
    aoCriar?.(grafico);

    const observador = new ResizeObserver(() => grafico.resize());
    observador.observe(elemento.current);
    return () => {
      observador.disconnect();
      grafico.dispose();
      instancia.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    instancia.current?.setOption({ ...BASE, ...opcao }, { replaceMerge: ['series'] });
  }, [opcao]);

  return (
    <div
      ref={elemento}
      style={{ height: altura }}
      role="img"
      aria-label={descricao}
      className="w-full"
    />
  );
}
