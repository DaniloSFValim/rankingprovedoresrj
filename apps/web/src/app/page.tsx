import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Secao } from '@/componentes/Secao';
import { TabelaRanking } from '@/componentes/TabelaRanking';
import { Destaques } from '@/componentes/Destaques';
import { BarrasShare } from '@/componentes/graficos/BarrasShare';
import { SerieMercado } from '@/componentes/graficos/SerieMercado';
import { MapaRJ } from '@/componentes/graficos/MapaRJ';
import {
  lerIndiceMunicipios,
  lerKpis,
  lerMeta,
  lerMovimentacoes,
  lerRankingEstadual,
  lerSerieEstado,
} from '@/lib/dados';
import { compacto, inteiro, percentual } from '@/lib/formato';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Banda larga fixa no ${MARCA.uf} — ranking, participação e evolução`,
  description:
    `Panorama do mercado de banda larga fixa do Estado do ${MARCA.uf}: maiores ` +
    `provedores, participação de mercado, crescimento e concentração, a partir ` +
    `dos dados oficiais da Anatel.`,
  openGraph: {
    title: `Ranking de Provedores de Banda Larga do ${MARCA.uf}`,
    description: `Dados atualizados sobre provedores de internet. Quem opera em cada município, com quantos acessos e qual participação.`,
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
    description: `Dados atualizados sobre provedores de internet. Quem opera em cada município, com quantos acessos e qual participação.`,
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
  const v12 = kpis.variacao12Meses?.percentual;

  return (
    <main className="space-y-14">
      <header className="max-w-4xl pt-4">
        <p className="text-sm text-grafite-400">
          Banda larga fixa no {MARCA.uf}, {rotularCompetencia(meta.competenciaAtual)}
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-tinta sm:text-4xl sm:leading-[1.15] md:text-[3.25rem] md:leading-[1.1]">
          <span className="numerico">{compacto(kpis.totalAcessos)}</span> acessos em{' '}
          <span className="numerico">{inteiro(kpis.numeroMunicipios)}</span> municípios, divididos entre{' '}
          <span className="numerico">{inteiro(kpis.numeroProvedores)}</span> provedores.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-grafite-300">
          {kpis.lider
            ? `O maior, ${kpis.lider.nome}, tem ${percentual(kpis.lider.marketShare, 1)} dos acessos. `
            : ''}
          {v12 !== null && v12 !== undefined
            ? `Em doze meses, o total ${v12 >= 0 ? 'cresceu' : 'caiu'} ${percentual(Math.abs(v12), 1)}.`
            : ''}
        </p>
        <nav className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-base" aria-label="Atalhos">
          <Link href="/ranking/" className="font-semibold text-marca-400 underline decoration-marca-700 decoration-2 underline-offset-4 hover:decoration-marca-400">
            Ver o ranking completo
          </Link>
          <Link href="/municipios/" className="font-semibold text-marca-400 underline decoration-marca-700 decoration-2 underline-offset-4 hover:decoration-marca-400">
            Procurar um município
          </Link>
        </nav>
      </header>

      <Secao
        titulo="O Estado, município por município"
        descricao="Clique num município para ver os números dele."
      >
        <div className="cartao p-4">
          <MapaRJ municipios={municipios} />
        </div>
      </Secao>

      <Secao
        titulo="O que mudou no mês"
        descricao={`De ${rotularCompetencia(movimentacoes.competenciaComparada)} para ${rotularCompetencia(movimentacoes.competencia)}`}
        href="/crescimento/"
        hrefRotulo="Ver todas as mudanças"
      >
        <Destaques movimentacoes={movimentacoes} />
      </Secao>

      <Secao
        titulo="Os dez maiores provedores"
        href="/ranking/"
        hrefRotulo="Ranking completo"
      >
        <TabelaRanking linhas={ranking} limite={10} />
      </Secao>

      <div className="grid gap-10 lg:grid-cols-2">
        <Secao titulo="Participação de mercado" descricao="Dez maiores provedores do Estado">
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
        descricao="Por número de acessos"
        href="/municipios/"
        hrefRotulo="Todos os municípios"
      >
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-grafite-700 text-left">
                <th className="px-3 py-2.5 font-medium text-grafite-400">Município</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Acessos</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Provedores</th>
                <th className="px-3 py-2.5 font-medium text-grafite-400">Líder</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Part. líder</th>
              </tr>
            </thead>
            <tbody>
              {municipios.slice(0, 10).map((m) => (
                <tr key={m.codigoIbge} className="border-b border-grafite-800 last:border-0 hover:bg-grafite-950">
                  <td className="px-3 py-2.5">
                    <Link href={`/municipios/${m.slug}/`} className="font-medium text-tinta underline-offset-2 hover:underline">
                      {m.nome}
                    </Link>
                  </td>
                  <td className="numerico px-3 py-2.5 text-right text-tinta">{inteiro(m.totalAcessos)}</td>
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
