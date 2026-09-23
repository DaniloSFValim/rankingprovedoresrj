import { canonizarTexto } from '@netrank/core';

/**
 * Nomes que aparecem mais de uma vez na lista. A Anatel registra acessos por
 * CNPJ, e grupos como Claro, Vivo e Oi operam com mais de um: sem o CNPJ ao
 * lado, as linhas ficam indistinguiveis.
 */
export function nomesRepetidos(itens: ReadonlyArray<{ nome: string }>): Set<string> {
  const contagem = new Map<string, number>();
  for (const { nome } of itens) {
    const chave = canonizarTexto(nome);
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return new Set([...contagem].filter(([, n]) => n > 1).map(([chave]) => chave));
}

export const ehRepetido = (repetidos: Set<string>, nome: string): boolean =>
  repetidos.has(canonizarTexto(nome));
