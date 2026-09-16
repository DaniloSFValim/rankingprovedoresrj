import Link from 'next/link';
import type { LinhaRankingEstadual } from '@/lib/dados';
import { corVariacao, inteiro, inteiroComSinal, percentual, percentualComSinal, setaVariacao } from '@/lib/formato';

/**
 * Tabela do ranking estadual (§9).
 *
 * A barra de participação é renderizada atrás do nome, e não em coluna
 * separada: a leitura da ordem de grandeza acontece no mesmo movimento
 * ocular da leitura do nome.
 */
export function TabelaRanking({
  linhas,
  limite,
  ocultarMunicipios = false,
}: {
  linhas: LinhaRankingEstadual[];
  limite?: number;
  /** Dentro de um município, a contagem de municípios atendidos é sempre 1. */
  ocultarMunicipios?: boolean;
}) {
  const exibidas = limite ? linhas.slice(0, limite) : linhas;
  const maiorShare = exibidas[0]?.marketShare ?? 1;

  return (
    <div className="cartao overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm" role="table">
        <thead>
          <tr className="border-b border-grafite-800 text-left" role="row">
            <th className="w-12 px-3 py-2.5 text-right font-medium text-grafite-400" scope="col">#</th>
            <th className="px-3 py-2.5 font-medium text-grafite-400" scope="col">Provedor</th>
            <th className="px-3 py-2.5 text-right font-medium text-grafite-400" scope="col">Acessos</th>
            <th className="px-3 py-2.5 text-right font-medium text-grafite-400" scope="col">Participação</th>
            <th className="px-3 py-2.5 text-right font-medium text-grafite-400" scope="col">Var. mensal</th>
            <th className="px-3 py-2.5 text-right font-medium text-grafite-400" scope="col">Var. 12 meses</th>
            {!ocultarMunicipios && (
              <th className="px-3 py-2.5 text-right font-medium text-grafite-400" scope="col">Municípios</th>
            )}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {exibidas.map((linha) => (
            <tr
              key={linha.empresaId}
              className="border-b border-grafite-800/60 last:border-0 hover:bg-grafite-800/40 focus-within:bg-grafite-800/60"
              role="row"
            >
              <td className="numerico px-3 py-2.5 text-right font-semibold text-grafite-300" role="cell">
                {linha.posicao}
              </td>
              <td className="relative px-3 py-2.5" role="cell">
                <div
                  className="absolute inset-y-1 left-0 rounded-r bg-marca-500/15"
                  style={{ width: `${(linha.marketShare / maiorShare) * 100}%` }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <Link
                    href={`/provedores/${linha.slug}/`}
                    className="font-medium text-white underline-offset-2 hover:underline focus:outline-2 focus:outline-offset-1 focus:outline-marca-400 rounded px-1"
                  >
                    {linha.nome}
                  </Link>
                  {linha.variacaoPosicao !== null && linha.variacaoPosicao !== 0 && (
                    <span className={`ml-2 text-xs ${corVariacao(linha.variacaoPosicao)}`}>
                      {setaVariacao(linha.variacaoPosicao)}
                      {Math.abs(linha.variacaoPosicao)}
                    </span>
                  )}
                  {linha.posicaoAnterior === null && (
                    <span className="ml-2 rounded bg-marca-500/20 px-1.5 py-0.5 text-[10px] font-medium text-marca-300">
                      NOVO
                    </span>
                  )}
                </div>
              </td>
              <td className="numerico px-3 py-2.5 text-right text-white">
                {inteiro(linha.acessos)}
              </td>
              <td className="numerico px-3 py-2.5 text-right text-grafite-200">
                {percentual(linha.marketShare, 2)}
              </td>
              <td className={`numerico px-3 py-2.5 text-right ${corVariacao(linha.variacaoAbsoluta)}`}>
                {inteiroComSinal(linha.variacaoAbsoluta)}
                <div className="text-[11px] opacity-70">
                  {percentualComSinal(linha.variacaoPercentual)}
                </div>
              </td>
              <td className={`numerico px-3 py-2.5 text-right ${corVariacao(linha.variacao12Absoluta)}`}>
                {inteiroComSinal(linha.variacao12Absoluta)}
                <div className="text-[11px] opacity-70">
                  {percentualComSinal(linha.variacao12Percentual)}
                </div>
              </td>
              {!ocultarMunicipios && (
                <td className="numerico px-3 py-2.5 text-right text-grafite-300">
                  {inteiro(linha.municipiosAtendidos)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
