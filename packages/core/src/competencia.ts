/** Utilitarios de competencia mensal (YYYY-MM). Toda a serie historica do
 *  NETRANK e indexada por estes valores; a aritmetica fica centralizada aqui
 *  para evitar erros de fuso horario ao usar `Date`. */

import type { Competencia } from './types.js';

const PADRAO = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function ehCompetenciaValida(valor: string): valor is Competencia {
  return PADRAO.test(valor);
}

export function asCompetencia(ano: number, mes: number): Competencia {
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2999) {
    throw new RangeError(`Ano fora de faixa: ${ano}`);
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new RangeError(`Mes fora de faixa: ${mes}`);
  }
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

function decompor(competencia: Competencia): { ano: number; mes: number } {
  const m = PADRAO.exec(competencia);
  if (!m) throw new RangeError(`Competencia invalida: ${competencia}`);
  return { ano: Number(m[1]), mes: Number(m[2]) };
}

/** Desloca uma competencia em N meses (N negativo retrocede). */
export function deslocarCompetencia(
  competencia: Competencia,
  meses: number,
): Competencia {
  const { ano, mes } = decompor(competencia);
  const total = ano * 12 + (mes - 1) + meses;
  return asCompetencia(Math.floor(total / 12), (total % 12) + 1);
}

/** Distancia em meses entre duas competencias (positiva se `b` e posterior). */
export function diferencaEmMeses(a: Competencia, b: Competencia): number {
  const ca = decompor(a);
  const cb = decompor(b);
  return (cb.ano * 12 + cb.mes) - (ca.ano * 12 + ca.mes);
}

/** Serie contigua e ordenada de competencias, inclusiva nos dois extremos. */
export function intervaloCompetencias(
  inicio: Competencia,
  fim: Competencia,
): Competencia[] {
  const total = diferencaEmMeses(inicio, fim);
  if (total < 0) return [];
  return Array.from({ length: total + 1 }, (_, i) => deslocarCompetencia(inicio, i));
}

/** Rotulo legivel em pt-BR, ex.: "ago/2026". */
export function rotularCompetencia(competencia: Competencia): string {
  const { ano, mes } = decompor(competencia);
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomes[mes - 1]}/${ano}`;
}
