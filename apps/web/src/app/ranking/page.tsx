import { Kpi } from '@/componentes/Kpi';
import { TabelaRanking } from '@/componentes/TabelaRanking';
import { BarrasShare } from '@/componentes/graficos/BarrasShare';
import { lerKpis, lerRankingEstadual } from '@/lib/dados';
import { compacto, inteiro, percentual } from '@/lib/formato';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Ranking dos provedores de internet do ${MARCA.uf}`,
  description:
    `Ranking completo dos provedores de banda larga fixa do Estado do ${MARCA.uf} ` +
    `por número de acessos, com participação de mercado e variação, segundo a Anatel.`,
};

export default function PaginaRanking() {
  const kpis = lerKpis();
  const ranking = lerRankingEstadual();
  const c = kpis.concentracao;

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          Ranking dos provedores no {MARCA.ufSigla}
        </h1>
        <p className="mt-1 text-sm text-grafite-400">
          {inteiro(ranking.length)} provedores — competência atual
        </p>
      </div>

      {/* Pódio — os três primeiros recebem destaque visual */}
      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-wide text-marca-400">Top 3 — Líderes</div>
        <div className="grid gap-3 md:grid-cols-3">
          {ranking.slice(0, 3).map((linha, indice) => (
            <div
              key={linha.empresaId}
              className={`cartao p-5 ${indice === 0 ? 'border-marca-700 bg-marca-950/40' : ''}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="numerico text-3xl font-bold text-marca-400">{linha.posicao}º</span>
                <span className="rotulo">{percentual(linha.marketShare, 2)} do mercado</span>
              </div>
              <div className="mt-2 truncate font-semibold text-white" title={linha.nome}>
                {linha.nome}
              </div>
              <div className="numerico mt-1 text-xl text-grafite-100">
                {inteiro(linha.acessos)}{' '}
                <span className="text-sm text-grafite-400">acessos</span>
              </div>
              <div className="mt-1 text-xs text-grafite-400">
                {inteiro(linha.municipiosAtendidos)} municípios atendidos
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-wide text-marca-400">Concentração de Mercado</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="CR1" valor={percentual(c?.cr1, 1)} detalhe="maior provedor" />
          <Kpi rotulo="CR3" valor={percentual(c?.cr3, 1)} detalhe="três maiores" />
          <Kpi rotulo="CR5" valor={percentual(c?.cr5, 1)} detalhe="cinco maiores" />
          <Kpi rotulo="CR10" valor={percentual(c?.cr10, 1)} detalhe="dez maiores" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-wide text-marca-400">Market Share dos Top 15</div>
        <div className="cartao p-3">
          <BarrasShare
            itens={ranking.slice(0, 15).map((l) => ({ nome: l.nome, marketShare: l.marketShare }))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-wide text-marca-400">Ranking Completo</div>
        <div className="cartao p-4 bg-grafite-900/50 border-b border-grafite-800">
          <p className="text-xs text-grafite-400 mb-3">💡 Dica: Use a busca global no topo para encontrar um provedor específico</p>
          <div className="grid gap-2 text-xs text-grafite-500">
            <p>Total de registros: {inteiro(ranking.length)}</p>
            <p>Fonte: Anatel, competência {kpis.competencia}</p>
          </div>
        </div>
        <TabelaRanking linhas={ranking} />
      </div>

      <p className="text-xs text-grafite-500">
        Total do Estado na competência: {compacto(kpis.totalAcessos)} acessos. Empresas
        sem competência anterior aparecem marcadas como NOVO e não recebem variação
        percentual — um entrante não cresceu, ele entrou.
      </p>
    </main>
  );
}
