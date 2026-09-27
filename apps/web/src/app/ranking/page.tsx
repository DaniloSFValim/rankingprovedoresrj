import { Kpi } from '@/componentes/Kpi';
import { TabelaRanking } from '@/componentes/TabelaRanking';
import { BarrasShare } from '@/componentes/graficos/BarrasShare';
import { TipoAtuacaoPie } from '@/componentes/graficos/TipoAtuacaoPie';
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
    <main className="space-y-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-tinta md:text-4xl">
          Ranking dos provedores no {MARCA.ufSigla}
        </h1>
        <p className="mt-1 text-sm text-grafite-400">
          {inteiro(ranking.length)} provedores — competência atual
        </p>
      </div>

            <div className="space-y-4">
        <h2 className="text-xl font-semibold text-tinta">Três maiores</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {ranking.slice(0, 3).map((linha, indice) => (
            <div
              key={linha.empresaId}
              className={`p-0 pt-3 ${indice === 0 ? 'border-t-4 border-marca-500' : 'border-t-2 border-tinta'}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="numerico text-3xl font-semibold text-tinta">{linha.posicao}º</span>
                <span className="rotulo">{percentual(linha.marketShare, 2)} do mercado</span>
              </div>
              <div className="mt-2 truncate font-semibold text-tinta" title={linha.nome}>
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
        <h2 className="text-xl font-semibold text-tinta">Concentração</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="CR1" valor={percentual(c?.cr1, 1)} detalhe="maior provedor" />
          <Kpi rotulo="CR3" valor={percentual(c?.cr3, 1)} detalhe="três maiores" />
          <Kpi rotulo="CR5" valor={percentual(c?.cr5, 1)} detalhe="cinco maiores" />
          <Kpi rotulo="CR10" valor={percentual(c?.cr10, 1)} detalhe="dez maiores" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-tinta">Participação dos 15 maiores</h2>
        <div className="cartao p-3">
          <BarrasShare
            itens={ranking.slice(0, 15).map((l) => ({ nome: l.nome, marketShare: l.marketShare }))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-tinta">Tipo de atuação</h2>
        <div className="cartao p-3">
          <TipoAtuacaoPie provedores={ranking} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-tinta">Todos os provedores</h2>
        <TabelaRanking linhas={ranking} />
      </div>

      <p className="text-xs text-grafite-500">
        Total do Estado na competência: {compacto(kpis.totalAcessos)} acessos. Empresas
        sem competência anterior aparecem marcadas como novas e não recebem variação
        percentual — um entrante não cresceu, ele entrou.
      </p>
    </main>
  );
}
