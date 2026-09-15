/**
 * Motor de calculo do NETRANK RJ.
 *
 * Regras invioláveis deste modulo:
 *  1. Nenhuma funcao inventa, estima ou interpola dados ausentes (§5).
 *     Ausencia de dado retorna `null`, nunca zero implicito.
 *  2. Crescimento absoluto e crescimento percentual sao grandezas distintas
 *     e jamais sao misturadas (§14).
 *  3. Arredondamento e responsabilidade da apresentacao. Os calculos
 *     intermediarios (em especial o HHI) usam shares em precisao plena.
 */

import type {
  IndicadoresConcentracao,
  LinhaRanking,
  LinhaRankingComVariacao,
  ParticipanteMercado,
} from './types.js';

/** Soma de acessos de um conjunto de participantes. */
export function totalAcessos(participantes: readonly ParticipanteMercado[]): number {
  let total = 0;
  for (const p of participantes) total += p.acessos;
  return total;
}

/**
 * Market share em pontos percentuais (0–100).
 * Retorna `null` quando o total e zero: 0/0 nao e 0%, e indefinido.
 */
export function marketShare(acessos: number, total: number): number | null {
  if (total <= 0) return null;
  return (acessos / total) * 100;
}

/**
 * Ordena participantes de forma deterministica: acessos decrescentes,
 * desempate por empresaId ascendente (garante reprodutibilidade entre execucoes).
 */
export function ordenarParticipantes(
  participantes: readonly ParticipanteMercado[],
): ParticipanteMercado[] {
  return [...participantes].sort(
    (a, b) => b.acessos - a.acessos || a.empresaId.localeCompare(b.empresaId),
  );
}

/**
 * Constroi o ranking de um mercado (estadual ou municipal).
 *
 * Participantes com 0 acessos sao excluidos: nao integram o mercado naquela
 * competencia. Empates recebem a mesma posicao (standard competition ranking:
 * 1, 2, 2, 4), preservando a cardinalidade real do mercado.
 */
export function construirRanking(
  participantes: readonly ParticipanteMercado[],
): LinhaRanking[] {
  const ativos = participantes.filter((p) => p.acessos > 0);
  const total = totalAcessos(ativos);
  const ordenados = ordenarParticipantes(ativos);

  const linhas: LinhaRanking[] = [];
  let posicaoCorrente = 0;
  let acessosAnterior: number | null = null;

  ordenados.forEach((p, indice) => {
    if (acessosAnterior === null || p.acessos !== acessosAnterior) {
      posicaoCorrente = indice + 1;
      acessosAnterior = p.acessos;
    }
    linhas.push({
      posicao: posicaoCorrente,
      empresaId: p.empresaId,
      acessos: p.acessos,
      marketShare: marketShare(p.acessos, total) ?? 0,
    });
  });

  return linhas;
}

/**
 * Enriquece o ranking atual com a comparacao contra uma competencia anterior.
 *
 * Empresa ausente na base anterior => `posicaoAnterior`, `variacaoAbsoluta` e
 * `variacaoPercentual` sao `null` (entrante; nao se calcula "crescimento
 * infinito"). Empresa presente antes com 0 acessos tambem produz
 * `variacaoPercentual = null`, pois a divisao por zero e indefinida — mas a
 * variacao absoluta continua valida e e preservada.
 */
export function compararRankings(
  atual: readonly LinhaRanking[],
  anterior: readonly LinhaRanking[],
): LinhaRankingComVariacao[] {
  const indiceAnterior = new Map<string, LinhaRanking>();
  for (const linha of anterior) indiceAnterior.set(linha.empresaId, linha);

  return atual.map((linha) => {
    const antes = indiceAnterior.get(linha.empresaId);
    if (!antes) {
      return {
        ...linha,
        posicaoAnterior: null,
        variacaoPosicao: null,
        acessosAnterior: null,
        variacaoAbsoluta: null,
        variacaoPercentual: null,
      };
    }
    const variacaoAbsoluta = linha.acessos - antes.acessos;
    return {
      ...linha,
      posicaoAnterior: antes.posicao,
      // Subir no ranking (posicao menor) e ganho: sinal positivo.
      variacaoPosicao: antes.posicao - linha.posicao,
      acessosAnterior: antes.acessos,
      variacaoAbsoluta,
      variacaoPercentual:
        antes.acessos > 0 ? (variacaoAbsoluta / antes.acessos) * 100 : null,
    };
  });
}

/**
 * Razao de concentracao CR-n: soma das participacoes dos n maiores.
 *
 * Quando o mercado tem menos de n provedores, o resultado e a soma de todos
 * (tende a 100). Isso e matematicamente correto e deve ser lido junto com
 * `numeroProvedores` — um CR5 de 100 em municipio com 3 provedores nao
 * significa o mesmo que em municipio com 40.
 */
export function razaoConcentracao(
  participantes: readonly ParticipanteMercado[],
  n: number,
): number | null {
  const ativos = participantes.filter((p) => p.acessos > 0);
  const total = totalAcessos(ativos);
  if (total <= 0) return null;
  const topN = ordenarParticipantes(ativos).slice(0, n);
  return (totalAcessos(topN) / total) * 100;
}

/**
 * HHI — Indice Herfindahl-Hirschman, escala 0–10000.
 *
 * Definido como a soma dos quadrados das participacoes percentuais de TODOS os
 * participantes do mercado (nao apenas dos maiores). Calculado a partir de
 * shares em precisao plena; arredondar antes de elevar ao quadrado introduz
 * erro material.
 *
 * Indicador estatistico de concentracao. O NETRANK nao converte o valor em
 * conclusao juridica ou regulatoria (§17).
 */
export function hhi(participantes: readonly ParticipanteMercado[]): number | null {
  const ativos = participantes.filter((p) => p.acessos > 0);
  const total = totalAcessos(ativos);
  if (total <= 0) return null;
  let soma = 0;
  for (const p of ativos) {
    const share = (p.acessos / total) * 100;
    soma += share * share;
  }
  return soma;
}

/** Calcula, de uma so passada, o painel completo de concentracao de um mercado. */
export function calcularConcentracao(
  participantes: readonly ParticipanteMercado[],
): IndicadoresConcentracao | null {
  const ativos = participantes.filter((p) => p.acessos > 0);
  const total = totalAcessos(ativos);
  if (total <= 0) return null;

  const ordenados = ordenarParticipantes(ativos);
  const acumuladoAte = (n: number) =>
    (totalAcessos(ordenados.slice(0, n)) / total) * 100;

  return {
    cr1: acumuladoAte(1),
    cr3: acumuladoAte(3),
    cr5: acumuladoAte(5),
    cr10: acumuladoAte(10),
    hhi: hhi(ativos) as number,
    numeroProvedores: ativos.length,
    totalAcessos: total,
  };
}

/**
 * Crescimento absoluto: diferenca bruta de acessos entre duas competencias.
 * Nunca use este valor para ordenar "maiores crescimentos percentuais".
 */
export function crescimentoAbsoluto(atual: number, anterior: number): number {
  return atual - anterior;
}

/**
 * Crescimento percentual. `null` quando a base e zero ou negativa —
 * um provedor que sai de 0 para 500 acessos nao cresceu "infinito%":
 * ele e um entrante, e a interface deve rotula-lo como tal.
 */
export function crescimentoPercentual(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/**
 * Taxa de crescimento composta anualizada (CAGR) em pontos percentuais.
 * Util para comparar janelas de tamanhos diferentes (3, 6, 12, 24 meses).
 */
export function cagrMensal(
  atual: number,
  anterior: number,
  meses: number,
): number | null {
  if (anterior <= 0 || atual <= 0 || meses <= 0) return null;
  return (Math.pow(atual / anterior, 1 / meses) - 1) * 100;
}
