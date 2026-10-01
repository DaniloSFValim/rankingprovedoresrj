'use client';

import { useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

/**
 * Invólucro do ECharts com o tema do produto.
 *
 * A paleta de séries é fixa e ordenada por contraste entre categorias
 * adjacentes: a cor identifica a série, não decora o gráfico.
 */
export const PALETA_SERIES = [
  '#0e7482', '#b5832a', '#6a4c93', '#1e7b4c', '#b3372c',
  '#3d6fb6', '#7c8a2e', '#a8558c', '#44515e', '#2c9c9c',
] as const;

const BASE: EChartsOption = {
  color: [...PALETA_SERIES],
  backgroundColor: 'transparent',
  textStyle: { fontFamily: 'var(--fonte-sans)', color: '#2e3a46' },
  grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
  tooltip: {
    backgroundColor: '#ffffff',
    borderColor: '#cdd4d8',
    textStyle: { color: '#1f2a35' },
    extraCssText: 'box-shadow: none; border-radius: 4px;',
  },
};

const EIXO = {
  axisLine: { lineStyle: { color: '#a3acb4' } },
  axisLabel: { color: '#56626e', fontSize: 11 },
  splitLine: { lineStyle: { color: '#e1e6e8' } },
};

export function eixo(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...EIXO, ...extra };
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
  // Opção mais recente. O ECharts carrega de forma assíncrona: se a opção
  // mudar antes disso (ex.: cidade salva aplicada logo após montar), a
  // criação precisa usar a versão atual, não a do primeiro render.
  const opcaoAtual = useRef(opcao);
  opcaoAtual.current = opcao;

  useEffect(() => {
    const el = elemento.current;
    if (!el) return;

    let isMounted = true;
    let observador: ResizeObserver | null = null;

    (async () => {
      const echartsModule = await import('echarts');
      const echarts = (echartsModule as any).init ? echartsModule : (echartsModule as any).default;

      if (!isMounted) return;

      const grafico = echarts.init(el, undefined, { renderer: 'canvas' });
      if (!isMounted) {
        grafico.dispose();
        return;
      }

      instancia.current = grafico;
      grafico.setOption({ ...BASE, ...opcaoAtual.current });
      aoCriar?.(grafico);

      observador = new ResizeObserver(() => grafico.resize());
      observador.observe(el);
    })();

    return () => {
      isMounted = false;
      if (observador) observador.disconnect();
      if (instancia.current) {
        instancia.current.dispose();
        instancia.current = null;
      }
    };
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
      className="w-full bg-grafite-800"
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
  }
);
