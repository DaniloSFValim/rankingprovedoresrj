/**
 * Saltos isolados numa série mensal: um mês que se afasta dos dois vizinhos
 * enquanto os vizinhos ficam próximos entre si. É o padrão de erro ou atraso de
 * declaração (o valor vai e volta), não de mudança real na base de clientes.
 * O número não é corrigido; o salto vira aviso.
 */
export interface SaltoIsolado<C extends string = string> {
  competencia: C;
  valor: number;
  /** Desvio em relação à média dos dois vizinhos, em pontos percentuais. */
  desvioPercentual: number;
}

export const LIMITES_SALTO = {
  /** Desvio mínimo do mês em relação à média dos vizinhos. */
  desvioMinimo: 0.05,
  /** Diferença máxima entre os dois vizinhos. */
  diferencaMaximaVizinhos: 0.03,
} as const;

export function saltosIsolados<C extends string>(
  serie: ReadonlyArray<{ competencia: C; valor: number | null }>,
  limites = LIMITES_SALTO,
): SaltoIsolado<C>[] {
  const saltos: SaltoIsolado<C>[] = [];
  for (let i = 1; i < serie.length - 1; i++) {
    const antes = serie[i - 1]!.valor;
    const atual = serie[i]!.valor;
    const depois = serie[i + 1]!.valor;
    if (antes === null || atual === null || depois === null || antes <= 0 || depois <= 0) continue;
    const media = (antes + depois) / 2;
    const desvio = atual / media - 1;
    if (Math.abs(desvio) >= limites.desvioMinimo && Math.abs(depois / antes - 1) <= limites.diferencaMaximaVizinhos) {
      saltos.push({ competencia: serie[i]!.competencia, valor: atual, desvioPercentual: desvio * 100 });
    }
  }
  return saltos;
}
