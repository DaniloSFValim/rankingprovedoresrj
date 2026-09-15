/**
 * Normalizacao de empresas (§8).
 *
 * A Anatel publica a mesma prestadora sob grafias distintas ao longo dos anos
 * ("FULANO TELECOM LTDA", "Fulano Telecom", "FULANO TELECOM ME"). Rankings
 * construidos sobre a grafia bruta sao simplesmente errados: uma empresa
 * aparece fatiada em tres linhas.
 *
 * Estrategia, em ordem de confianca:
 *   1. Override manual curado (tabela de apelidos, editavel no painel admin).
 *   2. Raiz do CNPJ (8 primeiros digitos) — criterio juridico de identidade.
 *   3. Nome canonizado (sem acentos, pontuacao ou sufixos societarios).
 *
 * O passo 3 e heuristico e pode errar. Por isso toda fusao decidida por nome
 * e registrada com sua origem, permitindo auditoria e correcao manual.
 */

const SUFIXOS_SOCIETARIOS = [
  'LTDA', 'LIMITADA', 'ME', 'EPP', 'EIRELI', 'SA', 'S A', 'S/A',
  'SOCIEDADE ANONIMA', 'EMPRESA INDIVIDUAL', 'MEI', 'MICROEMPRESA',
  'MATRIZ', 'FILIAL', 'MUNICIPAL', 'EM RECUPERACAO JUDICIAL',
];

/** Remove diacriticos e normaliza caixa/espacos. */
export function canonizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chave canonica de nome de empresa: texto canonizado com sufixos societarios
 * removidos das extremidades. Aplicado repetidamente porque grafias reais
 * empilham sufixos ("... EIRELI ME").
 */
export function chaveNomeEmpresa(nomeOriginal: string): string {
  let nome = canonizarTexto(nomeOriginal);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const sufixo of SUFIXOS_SOCIETARIOS) {
      if (nome.endsWith(` ${sufixo}`)) {
        nome = nome.slice(0, -(sufixo.length + 1)).trim();
        mudou = true;
      }
    }
  }
  return nome;
}

/** Mantem apenas digitos; retorna null se nao houver 14 digitos validos. */
export function normalizarCnpj(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 14 ? digitos : null;
}

/** Raiz do CNPJ (8 digitos) — identifica a pessoa juridica independente de filial. */
export function raizCnpj(cnpj: string | null): string | null {
  const normalizado = normalizarCnpj(cnpj);
  return normalizado ? normalizado.slice(0, 8) : null;
}

export type OrigemIdentidade = 'OVERRIDE_MANUAL' | 'RAIZ_CNPJ' | 'NOME_CANONICO';

export interface IdentidadeEmpresa {
  /** Identificador estavel da empresa no NETRANK. */
  empresaId: string;
  /** Como a identidade foi determinada — exposto na auditoria (§40). */
  origem: OrigemIdentidade;
}

export interface EntradaBrutaEmpresa {
  nomeAnatel: string;
  cnpj?: string | null;
}

/**
 * Resolve a identidade de uma linha bruta da Anatel.
 *
 * `overrides` mapeia chave canonica de nome -> empresaId definitivo, e e a
 * unica forma de corrigir uma fusao heuristica incorreta. Nao ha adivinhacao
 * por similaridade textual (Levenshtein e afins): o risco de fundir duas
 * empresas distintas e maior que o beneficio, e uma fusao errada contamina
 * silenciosamente todo o ranking.
 */
export function resolverIdentidadeEmpresa(
  entrada: EntradaBrutaEmpresa,
  overrides: ReadonlyMap<string, string> = new Map(),
): IdentidadeEmpresa {
  const chaveNome = chaveNomeEmpresa(entrada.nomeAnatel);

  const override = overrides.get(chaveNome);
  if (override) return { empresaId: override, origem: 'OVERRIDE_MANUAL' };

  const raiz = raizCnpj(entrada.cnpj ?? null);
  if (raiz) return { empresaId: `cnpj:${raiz}`, origem: 'RAIZ_CNPJ' };

  return { empresaId: `nome:${chaveNome}`, origem: 'NOME_CANONICO' };
}
