import { ReactNode } from 'react';
import { rotularCompetencia } from '@netrank/core';
import Link from 'next/link';
import { Secao } from '@/componentes/Secao';
import { compacto, inteiro, percentual } from '@/lib/formato';
import { MARCA } from '@/lib/marca';
import { ComparadorConfig } from '@/componentes/Comparador';

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

export const configuradorMunicipios: ComparadorConfig<Municipio, PerfilMunicipio> = {
  tipo: 'municipios',
  tituloPlural: 'Municípios',
  descricaoSeletor: `Compare a situação de banda larga em 2 ou mais cidades do ${MARCA.uf}`,
  renderizador: {
    nomeItem: (m) => m.nome,
    subtextoItem: (m) =>
      `${compacto(m.totalAcessos)} acessos • ${inteiro(m.numeroProvedores)} provedores`,
    nomeComparacao: (municipios) =>
      `Comparação lado a lado de ${municipios.length} municipalidades`,
    secoes: (municipios, kpisData) => (
      <>
        <Secao
          titulo="Indicadores Principais"
          descricao="Métricas de banda larga para cada município"
        >
          <div className="space-y-6">
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
    ),
  },
  urls: {
    indice: '/data/municipios/index.json',
    perfil: (slug) => `/data/municipios/${slug}.json`,
    kpis: '/data/estado/kpis.json',
  },
  extrairNomeDeSlug: (indice, slug) =>
    indice.find((x) => x.slug === slug)?.nome,
};

export const configuradorProvedores: ComparadorConfig<Provedor, PerfilProvedor> = {
  tipo: 'provedores',
  tituloPlural: 'Provedores',
  descricaoSeletor: `Compare prestadoras de banda larga no ${MARCA.uf}`,
  renderizador: {
    nomeItem: (p) => p.nome,
    subtextoItem: (p) =>
      `${compacto(p.acessos)} acessos • ${percentual(p.marketShare, 1)} market share`,
    nomeComparacao: (provedores) =>
      `Comparação lado a lado de ${provedores.length} prestadoras`,
    secoes: (provedores, kpisData) => (
      <>
        <Secao
          titulo="Indicadores Principais"
          descricao="Métricas estaduais de cada prestadora"
        >
          <div className="space-y-6">
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

        <div className="flex gap-3">
          <Link href="/provedores">
            <button className="px-4 py-2 rounded bg-grafite-800 hover:bg-grafite-700 text-white text-sm transition">
              ← Voltar a Provedores
            </button>
          </Link>
        </div>
      </>
    ),
  },
  urls: {
    indice: '/data/provedores/index.json',
    perfil: (slug) => `/data/provedores/${slug}.json`,
    kpis: '/data/estado/kpis.json',
  },
  extrairNomeDeSlug: (indice, slug) =>
    indice.find((x) => x.slug === slug)?.nome,
};
