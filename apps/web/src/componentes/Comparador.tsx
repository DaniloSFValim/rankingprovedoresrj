'use client';

import { ReactNode, useCallback, useState, useEffect } from 'react';
import { ErrorBoundary } from '@/componentes/ErrorBoundary';
import { SkeletonCard } from '@/componentes/Skeleton';
import { Secao } from '@/componentes/Secao';

export interface ComparadorConfig<T, P> {
  tipo: 'municipios' | 'provedores';
  tituloPlural: string;
  descricaoSeletor: string;
  renderizador: {
    nomeItem: (item: T) => string;
    subtextoItem: (item: T) => string;
    nomeComparacao: (perfis: P[]) => string;
    secoes: (perfis: P[], kpisData: any) => ReactNode;
  };
  urls: {
    indice: string;
    perfil: (slug: string) => string;
    kpis: string;
  };
  extrairNomeDeSlug: (indice: T[], slug: string) => string | undefined;
}

interface ComparadorProps<T, P> {
  config: ComparadorConfig<T, P>;
}

export function Comparador<T, P>({ config }: ComparadorProps<T, P>) {
  const [indice, setIndice] = useState<T[]>([]);
  const [perfis, setPerfis] = useState<P[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [perfisLoading, setPerfisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perfisError, setPerfisError] = useState<string | null>(null);
  const [kpisData, setKpisData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const indiceRes = await fetch(config.urls.indice);
        const kpisRes = await fetch(config.urls.kpis);

        if (!indiceRes.ok || !kpisRes.ok) {
          throw new Error('Erro ao buscar dados do servidor');
        }

        const indiceData = await indiceRes.json();
        const kpisData = await kpisRes.json();

        setIndice(
          config.tipo === 'municipios'
            ? indiceData.municipios || []
            : indiceData.provedores || []
        );
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
  }, [config]);

  useEffect(() => {
    const loadProfiles = async () => {
      if (selecionados.length === 0) {
        setPerfis([]);
        setPerfisError(null);
        return;
      }

      setPerfisLoading(true);
      setPerfisError(null);
      const profiles: P[] = [];

      try {
        for (const slug of selecionados) {
          try {
            const res = await fetch(config.urls.perfil(slug));
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
          throw new Error(`Nenhum perfil de ${config.tipo} foi carregado`);
        }

        setPerfis(profiles);
      } catch (err) {
        const message = err instanceof Error ? err.message : `Erro ao carregar perfis`;
        setPerfisError(message);
      } finally {
        setPerfisLoading(false);
      }
    };

    loadProfiles();
  }, [selecionados, config]);

  const adicionar = useCallback(
    (slug: string) => {
      if (!selecionados.includes(slug)) {
        setSelecionados([...selecionados, slug]);
      }
    },
    [selecionados]
  );

  const remover = useCallback(
    (slug: string) => {
      setSelecionados(selecionados.filter((s) => s !== slug));
    },
    [selecionados]
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

  if (perfis.length < 2) {
    return (
      <main className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Comparador de {config.tituloPlural}
          </h1>
          <p className="mt-2 text-sm text-grafite-400">
            {config.descricaoSeletor}
          </p>
        </div>

        {selecionados.length > 0 && (
          <Secao titulo="Selecionados" descricao="">
            <div className="flex flex-wrap gap-2">
              {selecionados.map((slug) => {
                const nome = config.extrairNomeDeSlug(indice, slug);
                return (
                  <button
                    key={slug}
                    onClick={() => remover(slug)}
                    className="px-3 py-1 rounded bg-marca-500 text-white text-sm hover:bg-marca-600 transition"
                  >
                    {nome} ✕
                  </button>
                );
              })}
            </div>
          </Secao>
        )}

        <Secao
          titulo={`Selecionar ${config.tituloPlural}`}
          descricao={config.descricaoSeletor}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {indice.map((item, idx) => {
              const key = (item as any).codigoIbge || (item as any).id;
              const slug = (item as any).slug;
              return (
                <button
                  key={key}
                  onClick={() => adicionar(slug)}
                  disabled={selecionados.includes(slug)}
                  className="text-left p-3 rounded hover:bg-grafite-800/60 disabled:opacity-50 disabled:cursor-default transition text-sm text-grafite-300 hover:text-white border border-transparent hover:border-grafite-700"
                >
                  <p className="font-medium">{config.renderizador.nomeItem(item)}</p>
                  <p className="text-xs text-grafite-500 mt-1">
                    {config.renderizador.subtextoItem(item)}
                  </p>
                </button>
              );
            })}
          </div>
        </Secao>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <main className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Comparador de {config.tituloPlural}
          </h1>
          <p className="mt-2 text-sm text-grafite-400">
            {config.renderizador.nomeComparacao(perfis)}
          </p>
          {kpisData && (
            <p className="mt-1 text-xs text-grafite-500">
              Dados de competência {kpisData.competencia}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {selecionados.map((slug) => {
            const nome = config.extrairNomeDeSlug(indice, slug);
            return (
              <button
                key={slug}
                onClick={() => remover(slug)}
                className="px-3 py-1 rounded bg-marca-500 text-white text-sm hover:bg-marca-600 transition"
              >
                {nome} ✕
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

        {perfisError && (
          <div className="cartao p-4 border-l-4 border-red-500 space-y-3">
            <p className="text-sm text-red-400">⚠️ {perfisError}</p>
            <button
              onClick={() => setSelecionados([...selecionados])}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs transition"
            >
              ↻ Tentar novamente
            </button>
          </div>
        )}

        {perfisLoading && (
          <Secao titulo="Carregando comparação..." descricao="">
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </Secao>
        )}

        {!perfisLoading && !perfisError && perfis.length >= 2 && (
          <>
            {config.renderizador.secoes(perfis, kpisData)}
          </>
        )}
      </main>
    </ErrorBoundary>
  );
}
