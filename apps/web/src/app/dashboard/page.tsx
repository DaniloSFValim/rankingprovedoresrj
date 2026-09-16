import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Kpi } from '@/componentes/Kpi';
import { Secao } from '@/componentes/Secao';
import { lerKpis, lerRankingEstadual, lerMovimentacoes } from '@/lib/dados';
import { compacto, inteiro, percentual, percentualComSinal } from '@/lib/formato';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Dashboard Gerencial — Banda Larga Fixa no ${MARCA.uf}`,
  description:
    `Painel para gestores municipais com KPIs de sua cidade, análise de competitividade, ` +
    `alertas de mudanças significativas e benchmark contra o estado.`,
};

/**
 * Dashboard Gerencial para gestores municipais (§48).
 *
 * Foco: Ajudar tomadores de decisão a entender:
 * - Situação atual da banda larga em sua cidade
 * - Comparação com média estadual
 * - Tendências e mudanças significativas
 * - Oportunidades de intervenção
 *
 * Renderiza estado agregado com seletor de cidade cliente-lado.
 */
export default function Dashboard() {
  const kpis = lerKpis();
  const ranking = lerRankingEstadual();
  const movimentacoes = lerMovimentacoes();

  return (
    <main className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Dashboard Gerencial
        </h1>
        <p className="mt-2 text-sm text-grafite-400">
          Painel de monitoramento do mercado de banda larga fixa em {MARCA.uf}
        </p>
        <p className="mt-1 text-xs text-grafite-500">
          Dados agregados de competência {rotularCompetencia(kpis.competencia)}
        </p>
      </div>

      {/* Seção 1: Status do Estado */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
          <div className="text-xs font-bold uppercase tracking-wide text-marca-400">
            Visão Geral — {MARCA.uf}
          </div>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            rotulo="Total de acessos"
            valor={compacto(kpis.totalAcessos)}
            detalhe={`${inteiro(kpis.totalAcessos)} conexões ativas`}
            ajuda="Todas as 92 municipalidades do estado"
          />
          <Kpi
            rotulo="Provedores operantes"
            valor={inteiro(ranking.length)}
            detalhe="com cobertura estadual"
            ajuda="Prestadoras com registros de acessos no período"
          />
          <Kpi
            rotulo="Líder estadual"
            valor={percentual(ranking[0]?.marketShare ?? 0, 1)}
            detalhe={ranking[0]?.nome ?? '—'}
            ajuda="Maior provedor por participação de mercado"
          />
          <Kpi
            rotulo="HHI (Concentração)"
            valor={inteiro(
              kpis.concentracao?.hhi ? Math.round(kpis.concentracao.hhi) : null,
            )}
            detalhe={
              !kpis.concentracao?.hhi
                ? '—'
                : kpis.concentracao.hhi < 1500
                  ? 'Desconcentrado'
                  : kpis.concentracao.hhi < 2500
                    ? 'Moderado'
                    : 'Concentrado'
            }
            ajuda="Índice Herfindahl-Hirschman. Menor = mais competição"
          />
        </div>
      </section>

      {/* Seção 2: Ranking Estadual Top 10 */}
      <Secao
        titulo="Top 10 Provedores"
        descricao="Maiores prestadoras de banda larga fixa por participação de mercado"
      >
        <div className="cartao overflow-x-auto">
          <p className="text-xs text-grafite-500 p-3 pb-0">
            Dados de competência {rotularCompetencia(kpis.competencia)} — estado agregado
          </p>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-grafite-800 text-left">
                <th className="px-3 py-2.5 font-medium text-grafite-400">Posição</th>
                <th className="px-3 py-2.5 font-medium text-grafite-400">Provedor</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">Acessos</th>
                <th className="px-3 py-2.5 text-right font-medium text-grafite-400">
                  Market Share
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking.slice(0, 10).map((provedor, idx) => (
                <tr
                  key={provedor.empresaId}
                  className="border-b border-grafite-800/60 last:border-0"
                >
                  <td className="px-3 py-2.5 font-bold text-white">{idx + 1}º</td>
                  <td className="px-3 py-2.5 text-white">{provedor.nome}</td>
                  <td className="numerico px-3 py-2.5 text-right text-grafite-200">
                    {compacto(provedor.acessos)}
                  </td>
                  <td className="numerico px-3 py-2.5 text-right text-marca-300">
                    {percentual(provedor.marketShare, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* Seção 3: Navegação */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500/60 to-transparent" />
          <div className="text-xs font-bold uppercase tracking-wide text-marca-400/80">
            Explorar
          </div>
          <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500/60 to-transparent" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/ranking">
            <div className="cartao p-4 hover:bg-grafite-800/60 transition">
              <h3 className="font-semibold text-white">Ranking Completo</h3>
              <p className="mt-1 text-xs text-grafite-400">
                Visualizar todos os provedores de banda larga do {MARCA.uf}.
              </p>
              <p className="mt-2 text-xs text-marca-400">→ Acessar →</p>
            </div>
          </Link>

          <Link href="/municipios">
            <div className="cartao p-4 hover:bg-grafite-800/60 transition">
              <h3 className="font-semibold text-white">Municípios</h3>
              <p className="mt-1 text-xs text-grafite-400">
                Análise detalhada de cada município do estado.
              </p>
              <p className="mt-2 text-xs text-marca-400">→ Explorar →</p>
            </div>
          </Link>

          <Link href="/provedores">
            <div className="cartao p-4 hover:bg-grafite-800/60 transition">
              <h3 className="font-semibold text-white">Provedores</h3>
              <p className="mt-1 text-xs text-grafite-400">
                Perfis detalhados de cada prestadora de serviço.
              </p>
              <p className="mt-2 text-xs text-marca-400">→ Consultar →</p>
            </div>
          </Link>

          <Link href="/compara/municipios">
            <div className="cartao p-4 hover:bg-grafite-800/60 transition">
              <h3 className="font-semibold text-white">Comparador de Cidades</h3>
              <p className="mt-1 text-xs text-grafite-400">
                Compare a situação de banda larga entre 2 ou mais municípios.
              </p>
              <p className="mt-2 text-xs text-marca-400">→ Comparar →</p>
            </div>
          </Link>

          <Link href="/compara/prestadoras">
            <div className="cartao p-4 hover:bg-grafite-800/60 transition">
              <h3 className="font-semibold text-white">Comparador de Provedores</h3>
              <p className="mt-1 text-xs text-grafite-400">
                Compare prestadoras lado a lado por acessos, market share e cobertura.
              </p>
              <p className="mt-2 text-xs text-marca-400">→ Comparar →</p>
            </div>
          </Link>

          <Link href="/dados">
            <div className="cartao p-4 hover:bg-grafite-800/60 transition">
              <h3 className="font-semibold text-white">Download de Dados</h3>
              <p className="mt-1 text-xs text-grafite-400">
                Exporte datasets em JSON, CSV e GeoJSON para análise e integração.
              </p>
              <p className="mt-2 text-xs text-marca-400">→ Acessar →</p>
            </div>
          </Link>

          <Link href="/transparencia">
            <div className="cartao p-4 hover:bg-grafite-800/60 transition">
              <h3 className="font-semibold text-white">Metodologia</h3>
              <p className="mt-1 text-xs text-grafite-400">
                Dados, fontes, validações e como interpretamos os indicadores.
              </p>
              <p className="mt-2 text-xs text-marca-400">→ Ler →</p>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
