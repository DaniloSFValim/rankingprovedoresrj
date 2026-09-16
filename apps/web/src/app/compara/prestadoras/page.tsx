'use client';

import { rotularCompetencia } from '@netrank/core';
import Link from 'next/link';
import { useCallback, useState, useEffect } from 'react';
import { Secao } from '@/componentes/Secao';
import { compacto, inteiro, percentual } from '@/lib/formato';
import { MARCA } from '@/lib/marca';
import { ErrorBoundary } from '@/componentes/ErrorBoundary';
import { SkeletonCard } from '@/componentes/Skeleton';

interface Provedor {
  id: string;
  slug: string;
  nome: string;
  acessos: number;
  marketShare: number;
  posicao: number;
  municipiosAtendidos: number;
}

interface PerfilProvedor {
  id: string;
  slug: string;
  nome: string;
  competencia: string;
  posicao: number;
  acessos: number;
  marketShare: number;
  municipiosAtendidos: number;
  municipiosLiderados: number;
  variacao12Meses?: { percentual: number | null } | null;
  presenca: Array<{
    codigoIbge: string;
    nome: string;
    marketShareLocal: number | null;
    lidera: boolean;
  }>;
  serie: Array<{
    competencia: string;
    acessos: number;
  }>;
}

/**
 * Comparador de Provedores (§49) - Client Component
 *
 * Permite selecionar e comparar 2+ provedores lado a lado.
 * Os dados são carregados dinamicamente via fetch.
 */
export default function ComparadorPrestadoras() {
  const [indice, setIndice] = useState<Provedor[]>([]);
  const [provedores, setProvedores] = useState<PerfilProvedor[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [kpisData, setKpisData] = useState<any>(null);

  useEffect(() => {
    // Load indices at build time
    const loadData = async () => {
      try {
        setError(null);
        // Load provider index and current KPIs
        const indiceRes = await fetch('/data/provedores/index.json');
        const kpisRes = await fetch('/data/estado/kpis.json');

        if (!indiceRes.ok || !kpisRes.ok) {
          throw new Error('Erro ao buscar dados do servidor');
        }

        const indiceData = await indiceRes.json();
        const kpisData = await kpisRes.json();

        setIndice(indiceData.provedores || []);
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
      if (selecionados.length === 0) {
        setProvedores([]);
        setProfilesError(null);
        return;
      }

      setProfilesLoading(true);
      setProfilesError(null);
      const profiles: PerfilProvedor[] = [];

      try {
        for (const slug of selecionados) {
          try {
            const res = await fetch(`/data/provedores/${slug}.json`);
            if (res.ok) {
              profiles.push(await res.json());
            } else {
              throw new Error(`Falha ao carregar ${slug}`);
            }
          } catch (err) {
            console.error(`Erro ao carregar ${slug}:`, err);
          }
        }

        if (profiles.length === 0 && selecionados.length > 0) {
          throw new Error('Nenhum perfil de provedor foi carregado');
        }

        setProvedores(profiles);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar perfis';
        setProfilesError(message);
      } finally {
        setProfilesLoading(false);
      }
    };

    loadProfiles();
  }, [selecionados]);

  const adicionarProvedor = useCallback(
    (slug: string) => {
      if (!selecionados.includes(slug)) {
        setSelecionados([...selecionados, slug]);
      }
    },
    [selecionados],
  );

  const removerProvedor = useCallback(
    (slug: string) => {
      setSelecionados(selecionados.filter((s) => s !== slug));
    },
    [selecionados],
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

  // Se menos de 2 provedores, mostrar seletor
  if (provedores.length < 2) {
    return (
      <main className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Comparador de Provedores
          </h1>
          <p className="mt-2 text-sm text-grafite-400">
            Compare prestadoras de banda larga no {MARCA.uf}
          </p>
        </div>

        {selecionados.length > 0 && (
          <Secao titulo="Selecionadas" descricao="">
            <div className="flex flex-wrap gap-2">
              {selecionados.map((slug) => {
                const p = indice.find((x) => x.slug === slug);
                return (
                  <button
                    key={slug}
                    onClick={() => removerProvedor(slug)}
                    className="px-3 py-1 rounded bg-marca-500 text-white text-sm hover:bg-marca-600 transition"
                  >
                    {p?.nome} ✕
                  </button>
                );
              })}
            </div>
          </Secao>
        )}

        <Secao
          titulo="Selecionar Provedores"
          descricao="Clique para adicionar 2 ou mais prestadoras à comparação"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {indice.map((p) => (
              <button
                key={p.id}
                onClick={() => adicionarProvedor(p.slug)}
                disabled={selecionados.includes(p.slug)}
                className="text-left p-3 rounded hover:bg-grafite-800/60 disabled:opacity-50 disabled:cursor-default transition text-sm text-grafite-300 hover:text-white border border-transparent hover:border-grafite-700"
              >
                <p className="font-medium">{p.nome}</p>
                <p className="text-xs text-grafite-500 mt-1">
                  {compacto(p.acessos)} acessos • {percentual(p.marketShare, 1)} market share
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
            Comparador de Provedores
          </h1>
          <p className="mt-2 text-sm text-grafite-400">
            Comparação lado a lado de {provedores.length} prestadoras
          </p>
          {kpisData && (
            <p className="mt-1 text-xs text-grafite-500">
              Dados de competência {rotularCompetencia(kpisData.competencia)}
            </p>
          )}
        </div>

        {/* Provedores Selecionados */}
        <div className="flex flex-wrap gap-2">
          {selecionados.map((slug) => {
            const p = indice.find((x) => x.slug === slug);
            return (
              <button
                key={slug}
                onClick={() => removerProvedor(slug)}
                className="px-3 py-1 rounded bg-marca-500 text-white text-sm hover:bg-marca-600 transition"
              >
                {p?.nome} ✕
              </button>
            );
          })}
          <button
            onClick={() => setSelecionados([])}
            className="px-3 py-1 rounded bg-grafite-700 text-grafite-300 text-sm hover:bg-grafite-600 transition"
          >
            Limpar
          </button>
        </div>

        {/* Erro ao carregar perfis */}
        {profilesError && (
          <div className="cartao p-4 border-l-4 border-red-500 space-y-3">
            <p className="text-sm text-red-400">⚠️ {profilesError}</p>
            <button
              onClick={() => setSelecionados([...selecionados])}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs transition"
            >
              ↻ Tentar novamente
            </button>
          </div>
        )}

        {/* Loading dos perfis */}
        {profilesLoading && (
          <Secao titulo="Carregando comparação..." descricao="">
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </Secao>
        )}

        {/* Comparação - mostrar apenas quando carregado */}
        {!profilesLoading && !profilesError && provedores.length >= 2 && (
          <>
            {/* Comparação de Métricas Principais */}
      <Secao
        titulo="Indicadores Principais"
        descricao="Métricas estaduais de cada prestadora"
      >
        <div className="space-y-6">
          {/* Acessos Totais */}
          <div className="cartao p-4">
            <h3 className="text-sm font-semibold text-grafite-400 mb-3">Acessos Totais</h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${provedores.length}, 1fr)` }}>
              {provedores.map((p) => (
                <div key={p.id} className="p-3 bg-grafite-900/50 rounded">
                  <p className="text-xs text-grafite-400">{p.nome}</p>
                  <p className="text-xl font-bold text-marca-300 mt-2">
                    {compacto(p.acessos)}
                  </p>
                  {p.variacao12Meses && p.variacao12Meses.percentual !== null && (
                    <p className="text-xs text-grafite-400 mt-1">
                      {p.variacao12Meses.percentual > 0 ? '+' : ''}{p.variacao12Meses.percentual.toFixed(1)}% (12m)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Market Share */}
          <div className="cartao p-4">
            <h3 className="text-sm font-semibold text-grafite-400 mb-3">Market Share Estadual</h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${provedores.length}, 1fr)` }}>
              {provedores.map((p) => (
                <div key={p.id} className="p-3 bg-grafite-900/50 rounded">
                  <p className="text-xs text-grafite-400">{p.nome}</p>
                  <p className="text-xl font-bold text-marca-300 mt-2">
                    {percentual(p.marketShare, 1)}
                  </p>
                  <p className="text-xs text-grafite-400 mt-1">
                    Posição: {inteiro(p.posicao)}º
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cobertura Territorial */}
          <div className="cartao p-4">
            <h3 className="text-sm font-semibold text-grafite-400 mb-3">Cobertura Territorial</h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${provedores.length}, 1fr)` }}>
              {provedores.map((p) => (
                <div key={p.id} className="p-3 bg-grafite-900/50 rounded">
                  <p className="text-xs text-grafite-400">{p.nome}</p>
                  <p className="text-sm font-semibold text-white mt-2">
                    {inteiro(p.municipiosAtendidos)} municípios
                  </p>
                  <p className="text-xs text-marca-300 mt-1">
                    {inteiro(p.municipiosLiderados)} liderados
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Secao>

      {/* Presença Municipal */}
      <Secao
        titulo="Presença em Municípios"
        descricao="Distribuição geográfica de cada prestadora"
      >
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(provedores.length, 2)}, 1fr)` }}>
          {provedores.map((p) => (
            <div key={p.id} className="cartao overflow-x-auto">
              <div className="p-3 border-b border-grafite-800">
                <p className="font-semibold text-white text-sm">{p.nome}</p>
                <p className="text-xs text-grafite-400 mt-1">
                  {inteiro(p.presenca.length)} municípios com presença
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full min-w-[300px] text-xs">
                  <thead>
                    <tr className="border-b border-grafite-800 sticky top-0 bg-grafite-900">
                      <th className="px-2 py-2 text-left font-medium text-grafite-400">
                        Município
                      </th>
                      <th className="px-2 py-2 text-right font-medium text-grafite-400">
                        Market
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.presenca.slice(0, 15).map((m) => (
                      <tr key={m.codigoIbge} className="border-b border-grafite-800/60 last:border-0">
                        <td className="px-2 py-2 text-grafite-300">
                          {m.nome}
                          {m.lidera && <span className="text-marca-300 ml-1">★</span>}
                        </td>
                        <td className="px-2 py-2 text-right text-marca-300">
                          {m.marketShareLocal ? percentual(m.marketShareLocal, 0) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {p.presenca.length > 15 && (
                <div className="p-2 text-xs text-grafite-500 border-t border-grafite-800">
                  +{p.presenca.length - 15} outros municípios
                </div>
              )}
            </div>
          ))}
        </div>
      </Secao>

      {/* Série Histórica */}
      {provedores[0]?.serie && provedores[0].serie.length > 0 && (
        <Secao
          titulo="Série Histórica (Acessos)"
          descricao="Evolução dos acessos ao longo do tempo"
        >
          <div className="cartao p-4 text-xs text-grafite-400">
            <div className="grid gap-4">
              {provedores.map((p) => (
                <div key={p.id} className="text-sm">
                  <p className="font-semibold text-white mb-2">{p.nome}</p>
                  <div className="flex flex-wrap gap-2">
                    {p.serie.map((s) => (
                      <div
                        key={s.competencia}
                        className="bg-grafite-900 px-2 py-1 rounded text-xs"
                      >
                        {rotularCompetencia(s.competencia)}: {compacto(s.acessos)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Secao>
      )}

            {/* Ações */}
            <div className="flex gap-3">
              <Link href="/provedores">
                <button className="px-4 py-2 rounded bg-grafite-800 hover:bg-grafite-700 text-white text-sm transition">
                  ← Voltar a Provedores
                </button>
              </Link>
            </div>
          </>
        )}
      </main>
    </ErrorBoundary>
  );
}
