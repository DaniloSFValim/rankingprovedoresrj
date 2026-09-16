import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Kpi } from '@/componentes/Kpi';
import { Secao } from '@/componentes/Secao';
import { TabelaRanking } from '@/componentes/TabelaRanking';
import { Destaques, TrocasLideranca } from '@/componentes/Destaques';
import { SeletorCidade, UltimaCidade } from '@/componentes/SeletorCidade';
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
};

export default function Home() {
  const meta = lerMeta();
  const kpis = lerKpis();
  const ranking = lerRankingEstadual();
  const serie = lerSerieEstado();
  const movimentacoes = lerMovimentacoes();
  const municipios = lerIndiceMunicipios();

  const concentracao = kpis.concentracao;

  return (
    <main className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          Banda larga fixa — {MARCA.uf}
        </h1>
        <p className="mt-1 text-sm text-grafite-400">
          Competência de referência: {rotularCompetencia(kpis.competencia)} · Série
          histórica de {meta.competencias.length} meses · Fonte: Anatel
        </p>
      </div>

      {/* A pergunta mais comum de quem chega é sobre a própria cidade.
          Por isso a escolha vem antes dos números do Estado, e não escondida
          numa aba interna. */}
      <section className="cartao flex flex-col gap-4 border-marca-900 bg-gradient-to-br from-marca-950/60 to-grafite-900/60 p-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md">
          <h2 className="text-lg font-semibold text-white">
            Quer ver só uma cidade?
          </h2>
          <p className="mt-1 text-sm text-grafite-300">
            Escolha um dos {inteiro(municipios.length)} municípios e veja o mercado
            inteiro sob a ótica dele: ranking local, quem lidera, quem cresce,
            concentração e evolução.
          </p>
          <div className="mt-2">
            <UltimaCidade
              cidades={municipios.map((m) => ({
                slug: m.slug, nome: m.nome,
                totalAcessos: m.totalAcessos, numeroProvedores: m.numeroProvedores,
              }))}
            />
          </div>
        </div>
        <SeletorCidade
          variante="destaque"
          cidades={municipios.map((m) => ({
            slug: m.slug, nome: m.nome,
            totalAcessos: m.totalAcessos, numeroProvedores: m.numeroProvedores,
          }))}
        />
      </section>

      {/* KPIs do §28 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          rotulo="Total de acessos"
          valor={compacto(kpis.totalAcessos)}
          detalhe={`${inteiro(kpis.totalAcessos)} acessos`}
          variacao={kpis.variacaoMensal?.percentual ?? null}
          variacaoTexto={`${percentualComSinal(kpis.variacaoMensal?.percentual)} no mês`}
        />
        <Kpi
          rotulo="Provedores ativos"
          valor={inteiro(kpis.numeroProvedores)}
          detalhe={`em ${inteiro(kpis.numeroMunicipios)} municípios`}
          ajuda="Provedores com pelo menos um acesso registrado no Estado na competência."
        />
        <Kpi
          rotulo="Maior provedor"
          valor={percentual(kpis.lider?.marketShare, 1)}
          detalhe={kpis.lider?.nome ?? '—'}
          ajuda="Participação do líder estadual — equivalente ao CR1."
        />
        <Kpi
          rotulo="Crescimento 12 meses"
          valor={percentualComSinal(kpis.variacao12Meses?.percentual)}
          detalhe={`${compacto(kpis.variacao12Meses?.absoluta)} acessos`}
          variacao={kpis.variacao12Meses?.percentual ?? null}
          variacaoTexto={`${compacto(kpis.variacao12Meses?.absoluta)} acessos no período`}
        />
        <Kpi
          rotulo="CR5"
          valor={percentual(concentracao?.cr5, 1)}
          detalhe="participação dos 5 maiores"
          ajuda="Soma das participações dos cinco maiores provedores do Estado."
        />
        <Kpi
          rotulo="HHI"
          valor={inteiro(concentracao?.hhi ? Math.round(concentracao.hhi) : null)}
          detalhe="escala 0–10.000"
          ajuda="Índice Herfindahl-Hirschman: soma dos quadrados das participações de todos os provedores. Indicador estatístico de concentração, sem conclusão regulatória."
        />
        <Kpi
          rotulo="Municípios analisados"
          valor={inteiro(kpis.numeroMunicipios)}
          detalhe="com acessos registrados"
        />
        <Kpi
          rotulo="Competências"
          valor={inteiro(meta.competencias.length)}
          detalhe={`${rotularCompetencia(meta.competencias[0]!)} → ${rotularCompetencia(kpis.competencia)}`}
        />
      </div>

      <Secao
        titulo="O que mudou no Rio de Janeiro?"
        descricao={`Comparação entre ${rotularCompetencia(movimentacoes.competenciaComparada)} e ${rotularCompetencia(movimentacoes.competencia)}`}
        href="/crescimento/"
        hrefRotulo="Ver crescimento e retração"
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
        descricao="Por número de acessos, com o líder local"
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
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">HHI</th>
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
                  <td className="numerico px-3 py-2.5 text-right text-grafite-300">
                    {inteiro(m.hhi ? Math.round(m.hhi) : null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao titulo="Trocas de liderança municipal" descricao="Municípios que mudaram de líder na última competência">
        <TrocasLideranca movimentacoes={movimentacoes} />
      </Secao>
    </main>
  );
}
