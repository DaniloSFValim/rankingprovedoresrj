'use client';

import { useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

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

const BASE: EChartsOption = {
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

export function eixo(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...EIXO_ESCURO, ...extra };
}

interface Props {
  opcao: EChartsOption;
  altura?: number;
  descricao: string;
  aoCriar?: (instancia: any) => void;
}

function GraficoInterno({ opcao, altura = 320, descricao, aoCriar }: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const instancia = useRef<any>(null);

  useEffect(() => {
    const el = elemento.current;
    if (!el) return;

    (async () => {
      const echartsModule = await import('echarts');
      const echarts = (echartsModule as any).init ? echartsModule : (echartsModule as any).default;
      const grafico = echarts.init(el, undefined, { renderer: 'canvas' });
      instancia.current = grafico;
      grafico.setOption({ ...BASE, ...opcao });
      aoCriar?.(grafico);

      const observador = new ResizeObserver(() => grafico.resize());
      observador.observe(el);
      return () => {
        observador.disconnect();
        grafico.dispose();
        instancia.current = null;
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (instancia.current) {
      instancia.current.setOption({ ...BASE, ...opcao }, { replaceMerge: ['series'] });
    }
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

function GraficoSkeleton() {
  return (
    <div
      className="w-full bg-grafite-800 animate-pulse"
      style={{ height: 320 }}
      role="status"
      aria-label="Carregando gráfico"
    />
  );
}

export const Grafico = dynamic(
  () => Promise.resolve(GraficoInterno),
  {
    loading: GraficoSkeleton,
    ssr: false
  }
);
