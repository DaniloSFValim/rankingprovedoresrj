'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { rotularCompetencia } from '@netrank/core';
import { Grafico, PALETA_SERIES } from '@/componentes/Grafico';
import { SeletorCidade } from '@/componentes/SeletorCidade';
import { useCidadeSelecionada } from '@/contextos/CidadeSelecionada';
import type { Corrida } from '@/lib/dados';
import type { CidadeOpcao } from '@/componentes/SeletorCidade';

/**
 * A Corrida do Ranking (§13).
 *
 * Eixo Y invertido: a 1ª posição fica no topo, como se lê um pódio. Sem essa
 * inversão o gráfico fica literalmente de cabeça para baixo em relação à
 * intuição de "subir no ranking".
 *
 * A animação revela a série mês a mês em vez de trocar de quadro: o objetivo
 * é mostrar a trajetória, não piscar estados isolados.
 *
 * Filtro por município: quando um município é selecionado, mostra apenas
 * os provedores que atuam naquela cidade.
 */
export function CorridaRanking({
  corrida,
  mapaMunicipioEmpresas,
  cidades,
}: {
  corrida: Corrida;
  mapaMunicipioEmpresas: Record<string, string[]>;
  cidades?: CidadeOpcao[];
}) {
  const { slugCidade } = useCidadeSelecionada();
  const [topN, setTopN] = useState(10);
  const [indice, setIndice] = useState(corrida.competencias.length - 1);
  const [tocando, setTocando] = useState(false);
  const [montado, setMontado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = corrida.competencias.length;

  useEffect(() => {
    setMontado(true);
  }, []);

  // Elegíveis: as N melhores posições na última competência.
  const visiveis = useMemo(() => {
    const ultima = corrida.competencias[total - 1];
    if (!ultima) return [];

    // Se há município selecionado, filtrar apenas empresas que atuam lá
    const empresasValidas = slugCidade
      ? new Set(mapaMunicipioEmpresas[slugCidade] ?? [])
      : null;

    const ordenadas = [...ultima.posicoes]
      .filter((p) => !empresasValidas || empresasValidas.has(p.empresaId))
      .sort((a, b) => a.posicao - b.posicao);
    return ordenadas.slice(0, topN).map((p) => p.empresaId);
  }, [corrida, topN, total, slugCidade, mapaMunicipioEmpresas]);

  useEffect(() => {
    if (!tocando) {
      if (temporizador.current) clearInterval(temporizador.current);
      return;
    }
    temporizador.current = setInterval(() => {
      setIndice((atual) => {
        if (atual >= total - 1) {
          setTocando(false);
          return atual;
        }
        return atual + 1;
      });
    }, 550);
    return () => {
      if (temporizador.current) clearInterval(temporizador.current);
    };
  }, [tocando, total]);

  const opcao = useMemo<EChartsOption>(() => {
    const rotulos = corrida.competencias.map((c) => rotularCompetencia(c.competencia));
    const nomePorId = new Map(corrida.empresas.map((e) => [e.id, e.nome]));

    const series = visiveis.map((empresaId, ordem) => {
      // Primeiros provedores têm linhas mais grossas para melhor distinção visual
      const larguralinha = ordem < 3 ? 3.5 : ordem < 7 ? 3 : 2.5;
      const tamanhoSimbolo = ordem < 3 ? 8 : ordem < 7 ? 7 : 6;
      return {
        name: nomePorId.get(empresaId) ?? empresaId,
        type: 'line' as const,
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: tamanhoSimbolo,
        lineStyle: { width: larguralinha },
        emphasis: { focus: 'series' as const, lineStyle: { width: larguralinha + 1.5 } },
        endLabel: {
          show: true,
          // '{a}' e o marcador do ECharts para o nome da serie.
          formatter: '{a}',
          color: PALETA_SERIES[ordem % PALETA_SERIES.length],
          fontSize: ordem < 3 ? 12 : 11,
          distance: 6,
        },
        // Revela apenas até a competência corrente da animação.
        data: corrida.competencias.slice(0, indice + 1).map((c) => {
          const encontrada = c.posicoes.find((p) => p.empresaId === empresaId);
          return encontrada ? encontrada.posicao : null;
        }),
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          type Item = { axisValueLabel?: string; marker?: string; seriesName?: string; value?: unknown };
          const lista = (Array.isArray(params) ? params : [params]) as Item[];
          const cabecalho = lista[0]?.axisValueLabel ?? '';
          const linhas = lista
            .filter((p) => p.value !== null && p.value !== undefined)
            .sort((a, b) => Number(a.value) - Number(b.value))
            .map((p) => `${p.marker ?? ''} ${p.seriesName ?? ''}: <b>${p.value}º</b>`);
          return `${cabecalho}<br/>${linhas.join('<br/>')}`;
        },
      },
      grid: { left: 8, right: 160, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: rotulos,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        inverse: true,
        min: 1,
        max: topN,
        interval: 1,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, formatter: '{value}º' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series,
    };
  }, [corrida, visiveis, indice, topN]);

  return (
    <div className="space-y-3">
      {cidades && cidades.length > 0 && montado && (
        <FiltroMunicipio cidades={cidades} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (indice >= total - 1) setIndice(0);
            setTocando((t) => !t);
          }}
          className="rounded-md bg-marca-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-marca-500"
        >
          {tocando ? '❚❚ Pausar' : '▶ Reproduzir'}
        </button>

        <div className="flex items-center gap-1">
          {[5, 10, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTopN(n)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                topN === n
                  ? 'bg-grafite-700 text-white'
                  : 'text-grafite-400 hover:bg-grafite-800 hover:text-white'
              }`}
            >
              Top {n}
            </button>
          ))}
        </div>

        <label className="flex flex-1 items-center gap-3 text-sm">
          <input
            type="range"
            min={0}
            max={total - 1}
            value={indice}
            onChange={(e) => {
              setTocando(false);
              setIndice(Number(e.target.value));
            }}
            className="h-1 flex-1 min-w-32 cursor-pointer accent-marca-500"
            aria-label="Competência exibida"
          />
          <span className="numerico w-20 shrink-0 text-right font-medium text-marca-300">
            {rotularCompetencia(corrida.competencias[indice]?.competencia ?? '')}
          </span>
        </label>
      </div>

      <Grafico
        opcao={opcao}
        altura={Math.max(360, topN * 28 + 80)}
        descricao={`Evolução da posição dos ${topN} maiores provedores de banda larga fixa do Rio de Janeiro ao longo dos meses.`}
      />
    </div>
  );
}

function FiltroMunicipio({ cidades }: { cidades: CidadeOpcao[] }) {
  const { slugCidade, selecionarCidade, limparSelecao } = useCidadeSelecionada();
  const cidadeSelecionada = cidades.find((c) => c.slug === slugCidade);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="text-sm text-grafite-400">Filtrar por cidade:</div>
      <SeletorCidade
        cidades={cidades}
        slugAtual={slugCidade ?? undefined}
        variante="compacto"
        onSelecionar={(cidade) => selecionarCidade(cidade.slug)}
      />
      {cidadeSelecionada && (
        <button
          type="button"
          onClick={limparSelecao}
          className="text-xs text-marca-400 hover:text-marca-300"
        >
          ✕ Mostrar todas as cidades
        </button>
      )}
    </div>
  );
}
