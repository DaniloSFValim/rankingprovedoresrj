import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Secao } from '@/componentes/Secao';
import { TabelaRanking } from '@/componentes/TabelaRanking';
import { Destaques } from '@/componentes/Destaques';
import { BarrasShare } from '@/componentes/graficos/BarrasShare';
import { SerieMercado } from '@/componentes/graficos/SerieMercado';
import {
  lerIndiceMunicipios,
  lerKpis,
  lerMeta,
  lerMovimentacoes,
  lerRankingEstadual,
  lerSerieEstado,
} from '@/lib/dados';
import { compacto, inteiro, percentual, percentualComSinal } from '@/lib/formato';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Banda larga fixa no ${MARCA.uf} — ranking, market share e evolução`,
  description:
    `Panorama do mercado de banda larga fixa do Estado do ${MARCA.uf}: maiores ` +
    `provedores, participação de mercado, crescimento e concentração, a partir ` +
    `dos dados oficiais da Anatel.`,
  openGraph: {
    title: `Ranking de Provedores de Banda Larga do ${MARCA.uf}`,
    description: `Dados atualizados sobre provedores de internet. Veja quais empresas operam, número de clientes, market share e análise completa por município.`,
    type: 'website',
    url: `https://rankingprovedoresrj.vercel.app/`,
    images: [
      {
        url: `https://rankingprovedoresrj.vercel.app/og-image.png`,
        width: 1200,
        height: 630,
        alt: `Ranking de Provedores de Banda Larga do ${MARCA.uf}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Ranking de Provedores de Banda Larga do ${MARCA.uf}`,
    description: `Dados atualizados sobre provedores de internet. Veja quais empresas operam, número de clientes e market share.`,
    images: [`https://rankingprovedoresrj.vercel.app/og-image.png`],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};


export default function Home() {
  const meta = lerMeta();
  const kpis = lerKpis();
  const ranking = lerRankingEstadual();
  const serie = lerSerieEstado();
  const movimentacoes = lerMovimentacoes();
  const municipios = lerIndiceMunicipios();

  return (
    <main className="space-y-12">
      {/* Cartão de portfólio */}
      <div className="mx-auto max-w-3xl">
        <div className="cartao space-y-6 p-6">
          {/* Título e descrição */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">
              Banda larga fixa no {MARCA.uf}
            </h1>
            <p className="text-grafite-300">
              Dados oficiais da Anatel: ranking de provedores, market share, concentração de mercado e evolução histórica.
            </p>
          </div>

          {/* Métricas principais em destaque */}
          <div className="grid grid-cols-3 gap-4 border-t border-grafite-700 pt-6">
            <div>
              <div className="text-2xl font-bold text-marca-400">
                {compacto(kpis.totalAcessos)}
              </div>
              <div className="text-sm text-grafite-400">Acessos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-marca-400">
                {percentual(kpis.lider?.marketShare, 1)}
              </div>
              <div className="text-sm text-grafite-400">Maior provedor</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-marca-400">
                {percentualComSinal(kpis.variacao12Meses?.percentual)}
              </div>
              <div className="text-sm text-grafite-400">Crescimento 12m</div>
            </div>
          </div>

          {/* Links de navegação */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Link
              href="/ranking/"
              className="inline-flex items-center rounded-lg bg-marca-500 px-4 py-2 font-medium text-white transition-colors hover:bg-marca-600"
            >
              Ranking de provedores
            </Link>
            <Link
              href="/crescimento/"
              className="inline-flex items-center rounded-lg border border-grafite-600 px-4 py-2 font-medium text-grafite-200 transition-colors hover:bg-grafite-800"
            >
              Crescimento
            </Link>
            <Link
              href="/municipios/"
              className="inline-flex items-center rounded-lg border border-grafite-600 px-4 py-2 font-medium text-grafite-200 transition-colors hover:bg-grafite-800"
            >
              Municípios
            </Link>
          </div>
        </div>
      </div>

      {/* Seções de análise */}
      <Secao
        titulo="Movimentações"
        descricao={`${rotularCompetencia(movimentacoes.competenciaComparada)} → ${rotularCompetencia(movimentacoes.competencia)}`}
        href="/crescimento/"
        hrefRotulo="Ver detalhes"
      >
        <Destaques movimentacoes={movimentacoes} />
      </Secao>

      <Secao
        titulo="Top 10 provedores"
        descricao="Maiores provedores do Estado por número de acessos"
        href="/ranking/"
        hrefRotulo="Ranking completo"
      >
        <TabelaRanking linhas={ranking} limite={10} />
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Participação de mercado" descricao="Top 10 provedores do Estado">
          <div className="cartao p-3">
            <BarrasShare itens={ranking.slice(0, 10).map((l) => ({ nome: l.nome, marketShare: l.marketShare }))} />
          </div>
        </Secao>

        <Secao titulo="Evolução do mercado" descricao="Total de acessos e provedores ativos por mês">
          <div className="cartao p-3">
            <SerieMercado serie={serie} />
          </div>
        </Secao>
      </div>

      <Secao
        titulo="Maiores municípios"
        descricao="Cidades com mais acessos registrados"
        href="/municipios/"
        hrefRotulo="Todos os municípios"
      >
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-grafite-800 text-left">
                <th className="px-3 py-2.5 font-medium text-grafite-400">Município</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Acessos</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Provedores</th>
                <th className="px-3 py-2.5 font-medium text-grafite-400">Líder</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Part. líder</th>
              </tr>
            </thead>
            <tbody>
              {municipios.slice(0, 10).map((m) => (
                <tr key={m.codigoIbge} className="border-b border-grafite-800/60 last:border-0 hover:bg-grafite-800/40">
                  <td className="px-3 py-2.5">
                    <Link href={`/municipios/${m.slug}/`} className="font-medium text-white underline-offset-2 hover:underline">
                      {m.nome}
                    </Link>
                  </td>
                  <td className="numerico px-3 py-2.5 text-right text-white">{inteiro(m.totalAcessos)}</td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-300">{inteiro(m.numeroProvedores)}</td>
                  <td className="px-3 py-2.5 text-grafite-200">{m.liderNome ?? '—'}</td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-200">{percentual(m.liderMarketShare, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </main>
  );
}
