/**
 * Modelo de dominio do NETRANK RJ.
 *
 * Escopo geografico: exclusivamente UF = RJ (ver docs/adr/0002-escopo-rj.md).
 * A estrutura admite outras UFs no futuro, mas nenhum calculo deste pacote
 * assume dados de fora do Rio de Janeiro.
 */

/** Competencia mensal no formato YYYY-MM (ex.: "2026-08"). */
export type Competencia = string;

/** Codigo IBGE de municipio (7 digitos). Municipios do RJ comecam com "33". */
export type CodigoIbge = string;

export const UF_ESCOPO = 'RJ' as const;

/**
 * Tecnologia de acesso normalizada.
 * A Anatel publica dezenas de rotulos; `classificarTecnologia` reduz a estes.
 */
export type Tecnologia =
  | 'FIBRA'
  | 'CABO'
  | 'RADIO'
  | 'SATELITE'
  | 'XDSL'
  | 'OUTRAS';

export interface Empresa {
  id: string;
  /** Nome exatamente como publicado pela Anatel (rastreabilidade, §5). */
  nomeOriginalAnatel: string;
  /** Nome de exibicao apos normalizacao (§8). */
  nomeNormalizado: string;
  cnpj: string | null;
  grupoEconomicoId: string | null;
  /** Classificacao de porte/categoria derivada dos dados, nunca arbitrada. */
  categoria: CategoriaEmpresa;
  status: 'ATIVA' | 'INATIVA';
}

/**
 * Categoria por porte no mercado do RJ. Os limiares sao convencao do NETRANK
 * e estao documentados na pagina de Metodologia — nao sao classificacao oficial
 * da Anatel.
 */
export type CategoriaEmpresa = 'NACIONAL' | 'REGIONAL' | 'LOCAL' | 'INDEFINIDA';

export interface GrupoEconomico {
  id: string;
  nome: string;
}

export interface Municipio {
  codigoIbge: CodigoIbge;
  nome: string;
  uf: 'RJ';
  /** Regiao de governo do Estado do RJ. */
  regiao: string | null;
}

/**
 * Fato basico do warehouse: acessos de uma empresa, em um municipio,
 * em uma competencia, para uma tecnologia.
 * Esta e a menor granularidade que o NETRANK persiste.
 */
export interface FatoAcesso {
  competencia: Competencia;
  codigoIbge: CodigoIbge;
  empresaId: string;
  tecnologia: Tecnologia;
  acessos: number;
}

/** Par (entidade, acessos) — insumo generico dos calculos de mercado. */
export interface ParticipanteMercado {
  empresaId: string;
  acessos: number;
}

export interface LinhaRanking {
  posicao: number;
  empresaId: string;
  acessos: number;
  /** Participacao em pontos percentuais (0–100). */
  marketShare: number;
}

export interface LinhaRankingComVariacao extends LinhaRanking {
  /** Posicao na competencia anterior; null se a empresa nao existia. */
  posicaoAnterior: number | null;
  /**
   * Posicoes ganhas (positivo) ou perdidas (negativo).
   * null quando nao ha base de comparacao.
   */
  variacaoPosicao: number | null;
  acessosAnterior: number | null;
  /** Variacao absoluta de acessos no periodo comparado. */
  variacaoAbsoluta: number | null;
  /** Variacao percentual de acessos. null se a base anterior for 0 ou ausente. */
  variacaoPercentual: number | null;
}

export interface IndicadoresConcentracao {
  /** Participacao do maior provedor, em pontos percentuais. */
  cr1: number;
  cr3: number;
  cr5: number;
  cr10: number;
  /** Herfindahl-Hirschman Index, escala 0–10000. */
  hhi: number;
  /** Numero de provedores com acessos > 0 considerados no calculo. */
  numeroProvedores: number;
  totalAcessos: number;
}

/** Metadados de autoria e citabilidade acadêmica. */
export interface AutorAcademico {
  nome: string;
  orcid?: string;
  email?: string;
}

export interface MetadadosAcademicos {
  autores: AutorAcademico[];
  afiliacao?: string;
  doi?: string;
  versaoDataset: string;
  licenca: 'CC-BY-4.0' | 'CC0' | 'MIT' | 'CC-BY-SA-4.0';
  commitHash: string;
  urlRepositorio: string;
}

/** Metadados de rastreabilidade exigidos pelo §5. */
export interface ProcedenciaDados {
  fonte: string;
  url: string;
  arquivo: string;
  competenciaInicial: Competencia;
  competenciaFinal: Competencia;
  /** ISO-8601 do momento da coleta. */
  coletadoEm: string;
  /** ISO-8601 do momento do processamento. */
  processadoEm: string;
  /**
   * true apenas em ambiente de desenvolvimento com fixtures sinteticas (§48).
   * A interface DEVE exibir aviso ostensivo quando verdadeiro.
   */
  dadosDemonstrativos: boolean;
  /** Metadados acadêmicos opcionais para repositórios formais. */
  academicos?: MetadadosAcademicos;
}
