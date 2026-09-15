import Link from 'next/link';
import type { Movimentacoes } from '@/lib/dados';
import { corVariacao, inteiroComSinal, percentualComSinal } from '@/lib/formato';

/**
 * Radar de mudanças (§27).
 *
 * Todo texto aqui é derivado dos dados — não há frase editorial escrita à mão.
 * O componente ordena fatos; a interpretação fica com quem lê.
 */
export function Destaques({ movimentacoes }: { movimentacoes: Movimentacoes }) {
  if (!movimentacoes.temBaseDeComparacao) {
    return (
      <div className="cartao p-6 text-sm text-grafite-400">
        Ainda não há competência anterior carregada para comparar. Importe pelo
        menos dois meses para que as movimentações sejam calculadas.
      </div>
    );
  }

  const crescimento = movimentacoes.maioresCrescimentosAbsolutos[0];
  const retracao = movimentacoes.maioresRetracoesAbsolutas[0];
  const avanco = movimentacoes.maioresAvancosRanking[0];
  const expansao = movimentacoes.maioresExpansoesTerritoriais[0];

  const cartoes = [
    crescimento && crescimento.variacaoAbsoluta !== null && crescimento.variacaoAbsoluta > 0
      ? {
          icone: '↑',
          rotulo: 'Maior crescimento',
          nome: crescimento.nome,
          slug: crescimento.slug,
          valor: `${inteiroComSinal(crescimento.variacaoAbsoluta)} acessos`,
          secundario: percentualComSinal(crescimento.variacaoPercentual),
          variacao: crescimento.variacaoAbsoluta,
        }
      : null,
    retracao && retracao.variacaoAbsoluta !== null && retracao.variacaoAbsoluta < 0
      ? {
          icone: '↓',
          rotulo: 'Maior retração',
          nome: retracao.nome,
          slug: retracao.slug,
          valor: `${inteiroComSinal(retracao.variacaoAbsoluta)} acessos`,
          secundario: percentualComSinal(retracao.variacaoPercentual),
          variacao: retracao.variacaoAbsoluta,
        }
      : null,
    avanco && avanco.variacaoPosicao !== null && avanco.variacaoPosicao > 0
      ? {
          icone: '↕',
          rotulo: 'Maior avanço no ranking',
          nome: avanco.nome,
          slug: avanco.slug,
          valor: `+${avanco.variacaoPosicao} posiç${avanco.variacaoPosicao > 1 ? 'ões' : 'ão'}`,
          secundario: inteiroComSinal(avanco.variacaoAbsoluta) + ' acessos',
          variacao: avanco.variacaoPosicao,
        }
      : null,
    expansao && expansao.variacao > 0
      ? {
          icone: '🏙',
          rotulo: 'Maior expansão territorial',
          nome: expansao.nome,
          slug: expansao.slug,
          valor: `+${expansao.variacao} município${expansao.variacao > 1 ? 's' : ''}`,
          secundario: `${expansao.municipiosAtual} no total`,
          variacao: expansao.variacao,
        }
      : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  if (cartoes.length === 0) {
    return (
      <div className="cartao p-6 text-sm text-grafite-400">
        Nenhuma movimentação relevante entre as duas últimas competências.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cartoes.map((c) => (
        <div key={c.rotulo} className="cartao p-4">
          <div className="flex items-center gap-1.5">
            <span className={`text-base ${corVariacao(c.variacao)}`}>{c.icone}</span>
            <span className="rotulo">{c.rotulo}</span>
          </div>
          <Link
            href={`/provedores/${c.slug}/`}
            className="mt-2 block truncate font-medium text-white underline-offset-2 hover:underline"
            title={c.nome}
          >
            {c.nome}
          </Link>
          <div className={`numerico mt-1 text-lg font-semibold ${corVariacao(c.variacao)}`}>
            {c.valor}
          </div>
          <div className="numerico text-xs text-grafite-400">{c.secundario}</div>
        </div>
      ))}
    </div>
  );
}

/** Lista compacta de trocas de liderança municipal (§26). */
export function TrocasLideranca({ movimentacoes }: { movimentacoes: Movimentacoes }) {
  const trocas = movimentacoes.trocasLiderancaMunicipal;
  if (trocas.length === 0) {
    return (
      <p className="cartao p-6 text-sm text-grafite-400">
        Nenhuma troca de liderança municipal entre as duas últimas competências.
      </p>
    );
  }
  return (
    <ul className="cartao divide-y divide-grafite-800">
      {trocas.map((t) => (
        <li key={t.codigoIbge} className="flex flex-wrap items-baseline gap-x-2 px-4 py-3 text-sm">
          <Link
            href={`/municipios/${t.slug}/`}
            className="font-medium text-white underline-offset-2 hover:underline"
          >
            {t.nome}
          </Link>
          <span className="text-grafite-400">passou a ser liderado por</span>
          <span className="font-medium text-alta">{t.liderAtual}</span>
          <span className="text-grafite-500">no lugar de {t.liderAnterior}</span>
        </li>
      ))}
    </ul>
  );
}
