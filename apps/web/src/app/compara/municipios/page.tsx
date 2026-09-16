'use client';

import { rotularCompetencia } from '@netrank/core';
import Link from 'next/link';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Secao } from '@/componentes/Secao';
import { compacto, inteiro, percentual } from '@/lib/formato';
import { MARCA } from '@/lib/marca';
import { ErrorBoundary } from '@/componentes/ErrorBoundary';
import { SkeletonCard } from '@/componentes/Skeleton';

interface Municipio {
  codigoIbge: string;
  slug: string;
  nome: string;
  totalAcessos: number;
  numeroProvedores: number;
}

interface PerfilMunicipio {
  codigoIbge: string;
  nome: string;
  competencia: string;
  concentracao?: { hhi: number } | null;
  variacao12Meses?: { percentual: number | null } | null;
  ranking: Array<{
    empresaId: string;
    nome: string;
    acessos: number;
    marketShare: number;
  }>;
  serie: Array<{
    competencia: string;
    totalAcessos: number | null;
  }>;
}

/**
 * Comparador de Municípios (§49) - Client Component
 *
 * Permite selecionar e comparar 2+ cidades lado a lado.
 * Os dados são carregados dinamicamente via API ou sessionStorage.
 */
export default function ComparadorMunicipios() {
  const [indice, setIndice] = useState<Municipio[]>([]);
  const [municipios, setMunicipios] = useState<PerfilMunicipio[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [perfilsLoading, setPerfilsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [kpisData, setKpisData] = useState<any>(null);

  useEffect(() => {
    // Load indices at build time
    const loadData = async () => {
      try {
        setError(null);
        // Load municipality index and current KPIs
        const indiceRes = await fetch('/data/municipios/index.json');
        const kpisRes = await fetch('/data/estado/kpis.json');

        if (!indiceRes.ok || !kpisRes.ok) {
          throw new Error('Erro ao buscar dados do servidor');
        }

        const indiceData = await indiceRes.json();
        const kpisData = await kpisRes.json();

        setIndice(indiceData.municipios || []);
        setKpisData(kpisData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load profiles when selections change
  useEffect(() => {
    const loadProfiles = async () => {
      if (selecionadas.length === 0) {
        setMunicipios([]);
        setProfileError(null);
        return;
      }

      setPerfilsLoading(true);
      setProfileError(null);
      const profiles: PerfilMunicipio[] = [];

      try {
        for (const slug of selecionadas) {
          try {
            const res = await fetch(`/data/municipios/${slug}.json`);
            if (res.ok) {
              profiles.push(await res.json());
            } else {
              throw new Error(`Falha ao carregar ${slug}`);
            }
          } catch (err) {
            console.error(`Erro ao carregar ${slug}:`, err);
          }
        }

        if (profiles.length === 0 && selecionadas.length > 0) {
          throw new Error('Nenhum perfil de município foi carregado');
        }

        setMunicipios(profiles);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar perfis';
        setProfileError(message);
      } finally {
        setPerfilsLoading(false);
      }
    };

    loadProfiles();
  }, [selecionadas]);

  const adicionarMunicipio = useCallback(
    (slug: string) => {
      if (!selecionadas.includes(slug)) {
        setSelecionadas([...selecionadas, slug]);
      }
    },
    [selecionadas],
  );

  const removerMunicipio = useCallback(
    (slug: string) => {
      setSelecionadas(selecionadas.filter((s) => s !== slug));
    },
    [selecionadas],
  );

  if (loading) {
    return (
      <ErrorBoundary>
        <main className="space-y-8">
          <div>
            <div className="h-8 bg-grafite-700 rounded w-1/3 animate-pulse mb-2" />
            <div className="h-4 bg-grafite-700 rounded w-1/2 animate-pulse" />
          </div>
          <Secao titulo="Carregando..." descricao="">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </Secao>
        </main>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <main className="space-y-8">
        <div className="cartao p-8 border-l-4 border-red-500 space-y-4">
          <h2 className="font-semibold text-white text-lg">⚠️ Erro ao carregar dados</h2>
          <p className="text-sm text-grafite-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm transition"
          >
            ↻ Recarregar página
          </button>
        </div>
      </main>
    );
  }

  // Se menos de 2 cidades, mostrar seletor
  if (municipios.length < 2) {
    return (
      <main className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Comparador de Municípios
          </h1>
          <p className="mt-2 text-sm text-grafite-400">
            Compare a situação de banda larga em 2 ou mais cidades do {MARCA.uf}
          </p>
        </div>

        {selecionadas.length > 0 && (
          <Secao titulo="Selecionadas" descricao="">
            <div className="flex flex-wrap gap-2">
              {selecionadas.map((slug) => {
                const m = indice.find((x) => x.slug === slug);
                return (
                  <button
                    key={slug}
                    onClick={() => removerMunicipio(slug)}
                    className="px-3 py-1 rounded bg-marca-500 text-white text-sm hover:bg-marca-600 transition"
                  >
                    {m?.nome} ✕
                  </button>
                );
              })}
            </div>
          </Secao>
        )}

        <Secao
          titulo="Selecionar Municípios"
          descricao="Clique para adicionar 2 ou mais cidades à comparação"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {indice.map((m) => (
              <button
                key={m.codigoIbge}
                onClick={() => adicionarMunicipio(m.slug)}
                disabled={selecionadas.includes(m.slug)}
                className="text-left p-3 rounded hover:bg-grafite-800/60 disabled:opacity-50 disabled:cursor-default transition text-sm text-grafite-300 hover:text-white border border-transparent hover:border-grafite-700"
              >
                <p className="font-medium">{m.nome}</p>
                <p className="text-xs text-grafite-500 mt-1">
                  {compacto(m.totalAcessos)} acessos • {inteiro(m.numeroProvedores)} provedores
                </p>
              </button>
            ))}
          </div>
        </Secao>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <main className="space-y-8">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Comparador de Municípios
          </h1>
          <p className="mt-2 text-sm text-grafite-400">
            Comparação lado a lado de {municipios.length} municipalidades
          </p>
          {kpisData && (
            <p className="mt-1 text-xs text-grafite-500">
              Dados de competência {rotularCompetencia(kpisData.competencia)}
            </p>
          )}
        </div>

        {/* Cidades Selecionadas */}
        <div className="flex flex-wrap gap-2">
          {selecionadas.map((slug) => {
            const m = indice.find((x) => x.slug === slug);
            return (
              <button
                key={slug}
                onClick={() => removerMunicipio(slug)}
                className="px-3 py-1 rounded bg-marca-500 text-white text-sm hover:bg-marca-600 transition"
              >
                {m?.nome} ✕
              </button>
            );
          })}
          <button
            onClick={() => setSelecionadas([])}
            className="px-3 py-1 rounded bg-grafite-700 text-grafite-300 text-sm hover:bg-grafite-600 transition"
          >
            Limpar
          </button>
        </div>

        {/* Erro ao carregar perfis */}
        {profileError && (
          <div className="cartao p-4 border-l-4 border-red-500 space-y-3">
            <p className="text-sm text-red-400">⚠️ {profileError}</p>
            <button
              onClick={() => setSelecionadas([...selecionadas])}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs transition"
            >
              ↻ Tentar novamente
            </button>
          </div>
        )}

        {/* Loading dos perfis */}
        {perfilsLoading && (
          <Secao titulo="Carregando comparação..." descricao="">
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </Secao>
        )}

        {/* Comparação - mostrar apenas quando carregado */}
        {!perfilsLoading && !profileError && municipios.length >= 2 && (
          <>
            {/* Comparação de KPIs */}
            <Secao
              titulo="Indicadores Principais"
              descricao="Métricas de banda larga para cada município"
            >
              <div className="space-y-6">
                {/* Total de Acessos */}
                <div className="cartao p-4">
                  <h3 className="text-sm font-semibold text-grafite-400 mb-3">Total de Acessos</h3>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${municipios.length}, 1fr)` }}>
                    {municipios.map((m) => (
                      <div key={m.codigoIbge} className="p-3 bg-grafite-900/50 rounded">
                        <p className="text-xs text-grafite-400">{m.nome}</p>
                        <p className="text-xl font-bold text-marca-300 mt-2">
                          {compacto(m.ranking[0]?.acessos ?? 0)}
                        </p>
                        {m.variacao12Meses && (
                          <p className="text-xs text-grafite-400 mt-1">
                            {m.variacao12Meses.percentual !== null
                              ? `${m.variacao12Meses.percentual > 0 ? '+' : ''}${m.variacao12Meses.percentual.toFixed(1)}% (12m)`
                              : 'Sem variação'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Número de Provedores */}
                <div className="cartao p-4">
                  <h3 className="text-sm font-semibold text-grafite-400 mb-3">Provedores Ativos</h3>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${municipios.length}, 1fr)` }}>
                    {municipios.map((m) => (
                      <div key={m.codigoIbge} className="p-3 bg-grafite-900/50 rounded">
                        <p className="text-xs text-grafite-400">{m.nome}</p>
                        <p className="text-xl font-bold text-marca-300 mt-2">
                          {inteiro(m.ranking.length)}
                        </p>
                        <p className="text-xs text-grafite-400 mt-1">
                          HHI: {m.concentracao?.hhi ? inteiro(Math.round(m.concentracao.hhi)) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Líder Local */}
                <div className="cartao p-4">
                  <h3 className="text-sm font-semibold text-grafite-400 mb-3">Provedor Líder</h3>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${municipios.length}, 1fr)` }}>
                    {municipios.map((m) => {
                      const lider = m.ranking[0];
                      return (
                        <div key={m.codigoIbge} className="p-3 bg-grafite-900/50 rounded">
                          <p className="text-xs text-grafite-400">{m.nome}</p>
                          <p className="text-sm font-semibold text-white mt-2">{lider?.nome ?? '—'}</p>
                          <p className="text-xs text-marca-300 mt-1">
                            {lider ? percentual(lider.marketShare, 1) : '—'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Secao>

            {/* Ranking Local */}
            <Secao titulo="Top 5 Provedores por Município" descricao="">
              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(municipios.length, 3)}, 1fr)` }}>
                {municipios.map((m) => (
                  <div key={m.codigoIbge} className="cartao overflow-x-auto">
                    <div className="p-3 border-b border-grafite-800">
                      <p className="font-semibold text-white text-sm">{m.nome}</p>
                    </div>
                    <table className="w-full min-w-[300px] text-xs">
                      <thead>
                        <tr className="border-b border-grafite-800">
                          <th className="px-2 py-2 text-left font-medium text-grafite-400">Pos</th>
                          <th className="px-2 py-2 text-left font-medium text-grafite-400">Provedor</th>
                          <th className="px-2 py-2 text-right font-medium text-grafite-400">Market</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.ranking.slice(0, 5).map((p, idx) => (
                          <tr key={p.empresaId} className="border-b border-grafite-800/60 last:border-0">
                            <td className="px-2 py-2 font-bold text-white">{idx + 1}</td>
                            <td className="px-2 py-2 text-grafite-200">{p.nome}</td>
                            <td className="px-2 py-2 text-right text-marca-300">
                              {percentual(p.marketShare, 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </Secao>

            {/* Série Histórica */}
            {municipios[0]?.serie && municipios[0].serie.length > 0 && (
              <Secao
                titulo="Série Histórica (Total de Acessos)"
                descricao="Evolução ao longo do tempo"
              >
                <div className="cartao p-4 text-xs text-grafite-400">
                  <p className="mb-3">
                    Comparação da série histórica de acessos para os municípios selecionados
                  </p>
                  <div className="grid gap-3">
                    {municipios.map((m) => (
                      <div key={m.codigoIbge} className="text-sm">
                        <p className="font-semibold text-white mb-2">{m.nome}</p>
                        <div className="flex flex-wrap gap-2">
                          {m.serie.map((p) => (
                            <div
                              key={p.competencia}
                              className="bg-grafite-900 px-2 py-1 rounded text-xs"
                            >
                              {rotularCompetencia(p.competencia)}: {compacto(p.totalAcessos ?? 0)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Secao>
            )}
          </>
        )}
      </main>
    </ErrorBoundary>
  );
}
