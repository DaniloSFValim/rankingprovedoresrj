import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Kpi } from '@/componentes/Kpi';
import { Secao } from '@/componentes/Secao';
import { TabelaRanking } from '@/componentes/TabelaRanking';
import { BarrasShare } from '@/componentes/graficos/BarrasShare';
import { SeletorCidade, UltimaCidade } from '@/componentes/SeletorCidade';
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
 * Usa dados da cidade selecionada no navegador global.
 */
export default function Dashboard() {
  const kpis = lerKpis();
  const ranking = lerRankingEstadual();
  const movimentacoes = lerMovimentacoes();
  const cidadeSelecionada = UltimaCidade();

  // Dados de contexto estadual para comparação
  const estadoKpis = kpis;
  const estadoRanking = ranking;

  return (
    <main className="space-y-8">
      {/* Cabeçalho com Seletor */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Dashboard Gerencial
          </h1>
          <p className="mt-1 text-sm text-grafite-400">
            Painel de monitoramento de banda larga fixa para gestores municipais
          </p>
        </div>

        {/* Seletor de Cidade */}
        <div className="cartao p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-grafite-500">
            Sua Cidade
          </p>
          <SeletorCidade />
          {cidadeSelecionada && (
            <p className="mt-2 text-xs text-grafite-400">
              Mostrando dados de <strong>{cidadeSelecionada.nome}</strong> · competência{' '}
              {rotularCompetencia(estadoKpis.competencia)}
            </p>
          )}
        </div>
      </div>

      {/* Aviso: Selecionar Cidade */}
      {!cidadeSelecionada && (
        <div className="rounded-lg border border-marca-600 bg-marca-950/30 p-4">
          <p className="text-sm text-marca-200">
            <strong>👆 Selecione sua cidade acima</strong> para ver dados personalizados. O painel
            mostrará KPIs, comparações estaduais e alertas específicos de sua municipalidade.
          </p>
        </div>
      )}

      {cidadeSelecionada ? (
        <>
          {/* Seção 1: Status Atual da Cidade */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500 to-transparent" />
              <div className="text-xs font-bold uppercase tracking-wide text-marca-400">
                Status Atual — {cidadeSelecionada.nome}
              </div>
              <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500 to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi
                rotulo="Total de acessos"
                valor={compacto(cidadeSelecionada.totalAcessos)}
                detalhe={`${inteiro(cidadeSelecionada.totalAcessos)} conexões`}
                variacao={
                  cidadeSelecionada.variacao12Meses?.percentual ?? null
                }
                variacaoTexto={`${percentualComSinal(cidadeSelecionada.variacao12Meses?.percentual)} em 12 meses`}
              />
              <Kpi
                rotulo="Provedores ativos"
                valor={inteiro(cidadeSelecionada.numeroProvedores)}
                detalhe="operando na cidade"
                ajuda="Prestadoras com pelo menos um acesso registrado nesta competência."
              />
              <Kpi
                rotulo="Líder local"
                valor={percentual(cidadeSelecionada.liderMarketShare, 1)}
                detalhe={cidadeSelecionada.liderNome ?? '—'}
                ajuda="Maior provedor da cidade por número de acessos."
              />
              <Kpi
                rotulo="HHI (Concentração)"
                valor={inteiro(
                  cidadeSelecionada.hhi ? Math.round(cidadeSelecionada.hhi) : null,
                )}
                detalhe={
                  cidadeSelecionada.hhi === null
                    ? '—'
                    : cidadeSelecionada.hhi < 1500
                      ? 'Desconcentrado'
                      : cidadeSelecionada.hhi < 2500
                        ? 'Moderado'
                        : 'Concentrado'
                }
                ajuda="Índice Herfindahl-Hirschman (0-10000). Mede competição: menor = mais concorrência."
              />
            </div>
          </section>

          {/* Seção 2: Benchmark contra Estado */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500/60 to-transparent" />
              <div className="text-xs font-bold uppercase tracking-wide text-marca-400/80">
                Comparação com o Estado
              </div>
              <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500/60 to-transparent" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Card: Acesso por Capita */}
              <div className="cartao p-4">
                <h3 className="text-sm font-semibold text-white">Acesso por Capita</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-grafite-400">Sua cidade</span>
                    <span className="text-lg font-bold text-white">
                      {(cidadeSelecionada.totalAcessos / 100000).toFixed(2)} por 100k hab.
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-grafite-400">{MARCA.uf} (média)</span>
                    <span className="text-lg font-bold text-grafite-300">
                      {(estadoKpis.totalAcessos / 6000000).toFixed(2)} por 100k hab.
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-grafite-500">
                    {cidadeSelecionada.totalAcessos > estadoKpis.totalAcessos / 92
                      ? '✓ Acima da média estadual'
                      : '⚠ Abaixo da média estadual'}
                  </p>
                </div>
              </div>

              {/* Card: Número de Provedores */}
              <div className="cartao p-4">
                <h3 className="text-sm font-semibold text-white">Diversidade de Provedores</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-grafite-400">Sua cidade</span>
                    <span className="text-lg font-bold text-white">
                      {inteiro(cidadeSelecionada.numeroProvedores)} provedores
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-grafite-400">{MARCA.uf} (total)</span>
                    <span className="text-lg font-bold text-grafite-300">
                      {inteiro(estadoRanking.length)} provedores
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-grafite-500">
                    {cidadeSelecionada.numeroProvedores >= 5
                      ? '✓ Boa competição'
                      : cidadeSelecionada.numeroProvedores >= 3
                        ? '⚠ Competição moderada'
                        : '🔴 Pouca competição'}
                  </p>
                </div>
              </div>

              {/* Card: Posição no Ranking */}
              <div className="cartao p-4">
                <h3 className="text-sm font-semibold text-white">Posição no Ranking Estadual</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-grafite-400">Por acessos</span>
                    <span className="text-lg font-bold text-marca-400">
                      {cidadeSelecionada.totalAcessos >= 10000 ? '🏆 Top 10' : '📊 Fora do top 10'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-grafite-500">
                    {estadoKpis.numeroMunicipios} municípios no total. Sua cidade está entre os
                    maiores mercados de banda larga do estado.
                  </p>
                </div>
              </div>

              {/* Card: Concentração */}
              <div className="cartao p-4">
                <h3 className="text-sm font-semibold text-white">Concentração (HHI)</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-grafite-400">Sua cidade</span>
                    <span className="text-lg font-bold text-white">
                      {cidadeSelecionada.hhi
                        ? Math.round(cidadeSelecionada.hhi).toLocaleString('pt-BR')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-grafite-400">{MARCA.uf} (estado)</span>
                    <span className="text-lg font-bold text-grafite-300">
                      {estadoKpis.concentracao?.hhi
                        ? Math.round(estadoKpis.concentracao.hhi).toLocaleString('pt-BR')
                        : '—'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-grafite-500">
                    Quanto menor, mais concorrência. Ideal: &lt; 1.500.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Seção 3: Alertas e Mudanças Significativas */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500/60 to-transparent" />
              <div className="text-xs font-bold uppercase tracking-wide text-marca-400/80">
                Alertas e Mudanças
              </div>
              <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500/60 to-transparent" />
            </div>

            <div className="space-y-2">
              {cidadeSelecionada.variacao12Meses &&
              cidadeSelecionada.variacao12Meses.percentual &&
              Math.abs(cidadeSelecionada.variacao12Meses.percentual) > 20 ? (
                <div className="rounded-lg border border-alta/30 bg-alta/10 p-3">
                  <p className="text-xs font-semibold text-alta">
                    📈 Mudança Significativa de Crescimento
                  </p>
                  <p className="mt-1 text-xs text-alta/80">
                    Sua cidade teve {percentualComSinal(cidadeSelecionada.variacao12Meses.percentual)}
                    % de crescimento nos últimos 12 meses (
                    {compacto(cidadeSelecionada.variacao12Meses.absoluta)} acessos).
                  </p>
                </div>
              ) : null}

              {cidadeSelecionada.numeroProvedores <= 2 ? (
                <div className="rounded-lg border border-marca-600 bg-marca-950/30 p-3">
                  <p className="text-xs font-semibold text-marca-200">
                    ⚠️ Alerta: Mercado Pouco Competitivo
                  </p>
                  <p className="mt-1 text-xs text-marca-100/80">
                    Apenas {cidadeSelecionada.numeroProvedores} provedor(es) ativ(os). Isso pode
                    limitar opções para consumidores. Considere políticas de atração de novos
                    provedores.
                  </p>
                </div>
              ) : null}

              {cidadeSelecionada.hhi && cidadeSelecionada.hhi > 5000 ? (
                <div className="rounded-lg border border-alta/30 bg-alta/10 p-3">
                  <p className="text-xs font-semibold text-alta">
                    🔴 Alerta: Mercado Altamente Concentrado
                  </p>
                  <p className="mt-1 text-xs text-alta/80">
                    HHI = {Math.round(cidadeSelecionada.hhi)} (muito elevado). Um único provedor
                    domina o mercado. Recomenda-se fomentar competição.
                  </p>
                </div>
              ) : null}

              {!cidadeSelecionada.variacao12Meses ||
              cidadeSelecionada.variacao12Meses.percentual === null ? (
                <div className="rounded-lg border border-grafite-700 bg-grafite-800/40 p-3">
                  <p className="text-xs font-semibold text-grafite-400">
                    ℹ️ Sem Dados de Comparação
                  </p>
                  <p className="mt-1 text-xs text-grafite-500">
                    Primeira vez que esta cidade aparece nos registros. Série histórica começará
                    no próximo mês.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* Seção 4: Ranking Local */}
          <Secao
            titulo="Provedores em Sua Cidade"
            descricao={`Ranking dos maiores provedores operando em ${cidadeSelecionada.nome}`}
          >
            <div className="cartao overflow-x-auto">
              <p className="text-xs text-grafite-500 p-3 pb-0">
                Dados de competência {rotularCompetencia(estadoKpis.competencia)}
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
                  {[...estadoRanking]
                    .sort((a, b) => b.marketShare - a.marketShare)
                    .slice(0, 10)
                    .map((l, idx) => (
                      <tr key={l.empresaId} className="border-b border-grafite-800/60 last:border-0">
                        <td className="px-3 py-2.5 font-bold text-white">{idx + 1}º</td>
                        <td className="px-3 py-2.5 text-white">{l.nome}</td>
                        <td className="numerico px-3 py-2.5 text-right text-grafite-200">
                          {compacto(l.acessos)}
                        </td>
                        <td className="numerico px-3 py-2.5 text-right text-marca-300">
                          {percentual(l.marketShare, 1)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Secao>

          {/* Seção 5: Próximas Ações */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-marca-500/60 to-transparent" />
              <div className="text-xs font-bold uppercase tracking-wide text-marca-400/80">
                Próximas Ações
              </div>
              <div className="h-0.5 flex-1 bg-gradient-to-l from-marca-500/60 to-transparent" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Link href={`/municipios/${cidadeSelecionada.slug}/`}>
                <div className="cartao p-4 hover:bg-grafite-800/60 transition">
                  <h3 className="font-semibold text-white">Análise Detalhada</h3>
                  <p className="mt-1 text-xs text-grafite-400">
                    Ver página completa de {cidadeSelecionada.nome} com série histórica, gráficos
                    e variações.
                  </p>
                  <p className="mt-2 text-xs text-marca-400">→ Acessar →</p>
                </div>
              </Link>

              <Link href="/compara/municipios">
                <div className="cartao p-4 hover:bg-grafite-800/60 transition">
                  <h3 className="font-semibold text-white">Comparar com Outras Cidades</h3>
                  <p className="mt-1 text-xs text-grafite-400">
                    Comparar indicadores de {cidadeSelecionada.nome} com outras municipalidades.
                  </p>
                  <p className="mt-2 text-xs text-marca-400">→ Comparar →</p>
                </div>
              </Link>

              <Link href="/ranking">
                <div className="cartao p-4 hover:bg-grafite-800/60 transition">
                  <h3 className="font-semibold text-white">Ranking Estadual</h3>
                  <p className="mt-1 text-xs text-grafite-400">
                    Ver ranking completo de provedores de banda larga do {MARCA.uf}.
                  </p>
                  <p className="mt-2 text-xs text-marca-400">→ Acessar →</p>
                </div>
              </Link>

              <Link href="/transparencia">
                <div className="cartao p-4 hover:bg-grafite-800/60 transition">
                  <h3 className="font-semibold text-white">Metodologia e Fonte</h3>
                  <p className="mt-1 text-xs text-grafite-400">
                    Entender como os dados são coletados, processados e validados.
                  </p>
                  <p className="mt-2 text-xs text-marca-400">→ Ler →</p>
                </div>
              </Link>
            </div>
          </section>
        </>
      ) : (
        /* Placeholder quando nenhuma cidade selecionada */
        <div className="cartao p-8 text-center">
          <p className="text-grafite-400">
            Selecione sua cidade no seletor acima para ver o dashboard personalizado.
          </p>
        </div>
      )}
    </main>
  );
}
