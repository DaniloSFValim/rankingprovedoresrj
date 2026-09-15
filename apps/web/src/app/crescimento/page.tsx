import Link from 'next/link';
import { rotularCompetencia } from '@netrank/core';
import { Secao } from '@/componentes/Secao';
import { RadarProvedores } from '@/componentes/graficos/Radar';
import { lerMovimentacoes, lerRankingEstadual } from '@/lib/dados';
import type { DestaqueEmpresa } from '@/lib/dados';
import { corVariacao, inteiroComSinal, percentualComSinal } from '@/lib/formato';
import { MARCA } from '@/lib/marca';

export const metadata = {
  title: `Quem cresce e quem perde clientes no ${MARCA.uf}`,
  description:
    `Provedores de banda larga fixa que mais ganharam e mais perderam acessos no ` +
    `Estado do ${MARCA.uf}, em valores absolutos e percentuais, segundo a Anatel.`,
};

/**
 * Lista de destaques.
 *
 * Absoluto e percentual aparecem em blocos SEPARADOS e nunca na mesma
 * ordenação (§14): misturar as duas grandezas faz um provedor minúsculo que
 * dobrou de tamanho parecer mais relevante que o líder que ganhou dezenas de
 * milhares de acessos.
 */
function ListaDestaques({
  itens,
  metrica,
}: {
  itens: DestaqueEmpresa[];
  metrica: 'absoluta' | 'percentual';
}) {
  const relevantes = itens.filter((i) =>
    metrica === 'absoluta' ? i.variacaoAbsoluta !== null : i.variacaoPercentual !== null,
  );

  if (relevantes.length === 0) {
    return <p className="cartao p-5 text-sm text-grafite-400">Sem dados comparáveis.</p>;
  }

  return (
    <ol className="cartao divide-y divide-grafite-800">
      {relevantes.map((item, indice) => {
        const valor = metrica === 'absoluta' ? item.variacaoAbsoluta : item.variacaoPercentual;
        return (
          <li key={item.empresaId} className="flex items-center gap-3 px-4 py-2.5">
            <span className="numerico w-5 shrink-0 text-right text-xs text-grafite-500">
              {indice + 1}
            </span>
            <Link
              href={`/provedores/${item.slug}/`}
              className="flex-1 truncate text-sm text-white underline-offset-2 hover:underline"
              title={item.nome}
            >
              {item.nome}
            </Link>
            <span className={`numerico shrink-0 text-sm font-medium ${corVariacao(valor)}`}>
              {metrica === 'absoluta'
                ? inteiroComSinal(item.variacaoAbsoluta)
                : percentualComSinal(item.variacaoPercentual)}
            </span>
            <span className="numerico w-20 shrink-0 text-right text-xs text-grafite-500">
              {metrica === 'absoluta'
                ? percentualComSinal(item.variacaoPercentual)
                : inteiroComSinal(item.variacaoAbsoluta)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PaginaCrescimento() {
  const m = lerMovimentacoes();
  const ranking = lerRankingEstadual();

  const pontosRadar = ranking
    .filter((l) => l.variacao12Percentual !== null && l.acessos > 0)
    .map((l) => ({
      nome: l.nome,
      crescimento: l.variacao12Percentual as number,
      acessos: l.acessos,
      marketShare: l.marketShare,
    }));

  return (
    <main className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          Crescimento e retração
        </h1>
        <p className="mt-1 text-sm text-grafite-400">
          Comparação entre {rotularCompetencia(m.competenciaComparada)} e{' '}
          {rotularCompetencia(m.competencia)}
        </p>
      </div>

      <Secao
        titulo="Radar dos provedores"
        descricao="Tamanho × crescimento × participação de mercado, em 12 meses"
      >
        <div className="cartao p-3">
          {pontosRadar.length > 0 ? (
            <RadarProvedores pontos={pontosRadar} />
          ) : (
            <p className="p-6 text-sm text-grafite-400">
              Sem 12 meses de histórico carregados para comparar.
            </p>
          )}
        </div>
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao
          titulo="Quem mais ganhou clientes"
          descricao="Crescimento absoluto — novos acessos no mês"
        >
          <ListaDestaques itens={m.maioresCrescimentosAbsolutos} metrica="absoluta" />
        </Secao>

        <Secao
          titulo="Quem mais perdeu clientes"
          descricao="Retração absoluta — acessos perdidos no mês"
        >
          <ListaDestaques itens={m.maioresRetracoesAbsolutas} metrica="absoluta" />
        </Secao>

        <Secao
          titulo="Maior crescimento percentual"
          descricao="Ritmo de expansão relativo ao próprio tamanho"
        >
          <ListaDestaques itens={m.maioresCrescimentosPercentuais} metrica="percentual" />
        </Secao>

        <Secao
          titulo="Maior queda percentual"
          descricao="Ritmo de retração relativo ao próprio tamanho"
        >
          <ListaDestaques itens={m.maioresRetracoesPercentuais} metrica="percentual" />
        </Secao>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Maiores avanços no ranking" descricao="Posições ganhas no mês">
          {m.maioresAvancosRanking.length > 0 ? (
            <ol className="cartao divide-y divide-grafite-800">
              {m.maioresAvancosRanking.map((i) => (
                <li key={i.empresaId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/provedores/${i.slug}/`} className="flex-1 truncate text-white underline-offset-2 hover:underline">
                    {i.nome}
                  </Link>
                  <span className="numerico font-medium text-alta">
                    +{i.variacaoPosicao}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="cartao p-5 text-sm text-grafite-400">Nenhum avanço no período.</p>
          )}
        </Secao>

        <Secao titulo="Expansão territorial" descricao="Municípios ganhos no mês (§25)">
          {m.maioresExpansoesTerritoriais.length > 0 ? (
            <ol className="cartao divide-y divide-grafite-800">
              {m.maioresExpansoesTerritoriais.map((i) => (
                <li key={i.empresaId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/provedores/${i.slug}/`} className="flex-1 truncate text-white underline-offset-2 hover:underline">
                    {i.nome}
                  </Link>
                  <span className={`numerico font-medium ${corVariacao(i.variacao)}`}>
                    {inteiroComSinal(i.variacao)}
                  </span>
                  <span className="numerico w-16 text-right text-xs text-grafite-500">
                    {i.municipiosAtual} mun.
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="cartao p-5 text-sm text-grafite-400">Sem base de comparação.</p>
          )}
        </Secao>
      </div>

      <p className="text-xs text-grafite-500">
        Crescimento absoluto e percentual são grandezas distintas e nunca aparecem na
        mesma ordenação. Provedores sem competência anterior não recebem variação
        percentual: um entrante não cresceu, ele entrou.
      </p>
    </main>
  );
}
