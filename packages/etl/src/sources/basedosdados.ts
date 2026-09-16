/**
 * Fonte alternativa: Base dos Dados (BigQuery).
 *
 * POR QUE ESTA FONTE EXISTE
 * -------------------------
 * A descoberta automatica no portal da Anatel se mostrou inviavel: a API do
 * dados.gov.br exige chave vinculada a perfil de Administrador de Organizacao,
 * e o inventario publico da Anatel raramente traz link direto de arquivo.
 *
 * A Base dos Dados mantem os microdados de acessos de banda larga fixa da
 * Anatel tratados e consultaveis via BigQuery.
 *
 * PROCEDENCIA (§5): os dados continuam sendo da Anatel, mas passam por
 * tratamento de terceiro. A interface DEVE declarar "Anatel, via Base dos
 * Dados" — atribuir diretamente a Anatel esconderia uma camada de
 * processamento que nao e nossa nem dela.
 *
 * DESCOBERTA DE SCHEMA
 * --------------------
 * Ao contrario de um CSV, o BigQuery e introspectavel: da para perguntar quais
 * tabelas e colunas existem. Este modulo NAO codifica nomes de coluna — ele
 * consulta INFORMATION_SCHEMA e mapeia por sinonimos. E o que impede o
 * pipeline de quebrar quando a Base dos Dados renomeia um campo.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { canonizarTexto } from '@netrank/core';

export const PROJETO_BDD = 'basedosdados';
export const DATASET_BDD = 'br_anatel_banda_larga_fixa';

export const PROCEDENCIA_BDD = {
  fonte: 'Anatel — Agência Nacional de Telecomunicações, via Base dos Dados',
  url: 'https://basedosdados.org/dataset/4ba41417-ba19-4022-bc24-6837db973009',
  observacao:
    'Microdados originais da Anatel (SCM), tratados e disponibilizados pela ' +
    'Base dos Dados em BigQuery. O tratamento intermediário não é de ' +
    'responsabilidade da Anatel nem do NETRANK RJ.',
} as const;

export class CredenciaisAusentesError extends Error {
  constructor() {
    super(
      'Credenciais do BigQuery nao encontradas.\n' +
        'Defina GOOGLE_APPLICATION_CREDENTIALS_JSON com o JSON da conta de servico,\n' +
        'ou GOOGLE_APPLICATION_CREDENTIALS com o caminho do arquivo.\n' +
        'A consulta e cobrada no SEU projeto do Google Cloud (camada gratuita: 1 TB/mes);\n' +
        'a Base dos Dados hospeda os dados, mas nao paga a consulta.',
    );
    this.name = 'CredenciaisAusentesError';
  }
}

/**
 * Cria o cliente. O projeto de faturamento e o do usuario — a Base dos Dados
 * apenas hospeda os dados publicos.
 */
export function criarCliente(): BigQuery {
  const json = process.env['GOOGLE_APPLICATION_CREDENTIALS_JSON']?.trim();
  const caminho = process.env['GOOGLE_APPLICATION_CREDENTIALS']?.trim();
  const projetoExplicito = process.env['GOOGLE_CLOUD_PROJECT']?.trim();

  if (json) {
    const credenciais = JSON.parse(json) as { project_id?: string };
    const projeto = projetoExplicito || credenciais.project_id;
    return new BigQuery({
      credentials: credenciais,
      ...(projeto ? { projectId: projeto } : {}),
    });
  }
  if (caminho) {
    return new BigQuery(projetoExplicito ? { projectId: projetoExplicito } : {});
  }
  throw new CredenciaisAusentesError();
}

export interface ColunaTabela {
  tabela: string;
  coluna: string;
  tipo: string;
}

/** Lista as tabelas do dataset da Anatel na Base dos Dados. */
export async function listarTabelas(cliente: BigQuery): Promise<string[]> {
  const [linhas] = await cliente.query({
    query:
      `SELECT table_name FROM \`${PROJETO_BDD}.${DATASET_BDD}\`.INFORMATION_SCHEMA.TABLES ` +
      `ORDER BY table_name`,
    location: 'US',
  });
  return (linhas as Array<{ table_name: string }>).map((l) => l.table_name);
}

/** Descreve as colunas de todas as tabelas do dataset. */
export async function descreverColunas(cliente: BigQuery): Promise<ColunaTabela[]> {
  const [linhas] = await cliente.query({
    query:
      `SELECT table_name, column_name, data_type ` +
      `FROM \`${PROJETO_BDD}.${DATASET_BDD}\`.INFORMATION_SCHEMA.COLUMNS ` +
      `ORDER BY table_name, ordinal_position`,
    location: 'US',
  });
  return (linhas as Array<{ table_name: string; column_name: string; data_type: string }>).map(
    (l) => ({ tabela: l.table_name, coluna: l.column_name, tipo: l.data_type }),
  );
}

/** Campos que o NETRANK precisa localizar no schema remoto. */
export type CampoBdd =
  | 'ano' | 'mes' | 'uf' | 'municipio' | 'empresa' | 'cnpj'
  | 'grupo' | 'tecnologia' | 'acessos';

/** Sinonimos canonizados, na convencao de nomes da Base dos Dados. */
const SINONIMOS: Record<CampoBdd, readonly string[]> = {
  ano: ['ANO'],
  mes: ['MES'],
  uf: ['SIGLA UF', 'UF'],
  municipio: ['ID MUNICIPIO', 'ID MUNICIPIO IBGE', 'CODIGO MUNICIPIO', 'MUNICIPIO'],
  empresa: ['EMPRESA', 'NOME EMPRESA', 'PRESTADORA', 'RAZAO SOCIAL'],
  cnpj: ['CNPJ'],
  grupo: ['GRUPO ECONOMICO', 'GRUPO'],
  tecnologia: ['TECNOLOGIA', 'MEIO DE ACESSO', 'TRANSMISSAO'],
  acessos: ['ACESSOS', 'QUANTIDADE ACESSOS', 'QUANTIDADE'],
};

const OBRIGATORIOS: readonly CampoBdd[] = ['ano', 'mes', 'uf', 'empresa', 'acessos'];

export type MapaBdd = Partial<Record<CampoBdd, string>>;

export class SchemaIncompativelError extends Error {
  constructor(readonly tabela: string, readonly faltantes: readonly CampoBdd[], readonly colunas: readonly string[]) {
    super(
      `A tabela ${tabela} nao expoe os campos obrigatorios: ${faltantes.join(', ')}.\n` +
        `Colunas disponiveis: ${colunas.join(', ')}.\n` +
        `Estenda SINONIMOS em packages/etl/src/sources/basedosdados.ts.`,
    );
    this.name = 'SchemaIncompativelError';
  }
}

/** Mapeia as colunas reais de uma tabela para os campos do dominio. */
export function mapearColunas(tabela: string, colunas: readonly string[]): MapaBdd {
  const porCanonico = new Map<string, string>();
  for (const coluna of colunas) porCanonico.set(canonizarTexto(coluna), coluna);

  const mapa: MapaBdd = {};
  for (const [campo, sinonimos] of Object.entries(SINONIMOS) as Array<[CampoBdd, readonly string[]]>) {
    for (const sinonimo of sinonimos) {
      const encontrada = porCanonico.get(sinonimo);
      if (encontrada !== undefined) {
        mapa[campo] = encontrada;
        break;
      }
    }
  }

  const faltantes = OBRIGATORIOS.filter((c) => mapa[c] === undefined);
  if (faltantes.length > 0) throw new SchemaIncompativelError(tabela, faltantes, colunas);
  return mapa;
}

/**
 * Escolhe a tabela de microdados entre as disponiveis.
 * Prefere um nome que mencione microdados; senao, a que tiver mais campos
 * obrigatorios mapeaveis.
 */
export function escolherTabela(
  colunasPorTabela: ReadonlyMap<string, string[]>,
): string | null {
  const nomes = [...colunasPorTabela.keys()];
  const preferida = nomes.find((n) => canonizarTexto(n).includes('MICRODADOS'));
  if (preferida) return preferida;

  let melhor: string | null = null;
  let melhorPontuacao = -1;
  for (const [tabela, colunas] of colunasPorTabela) {
    let pontuacao = 0;
    try {
      mapearColunas(tabela, colunas);
      pontuacao = 100;
    } catch {
      const canonicas = new Set(colunas.map(canonizarTexto));
      pontuacao = OBRIGATORIOS.filter((campo) =>
        SINONIMOS[campo].some((s) => canonicas.has(s)),
      ).length;
    }
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhor = tabela;
    }
  }
  return melhor;
}

export interface LinhaBdd {
  ano: number;
  mes: number;
  codigoIbge: string | null;
  empresa: string;
  cnpj: string | null;
  grupo: string | null;
  tecnologia: string | null;
  acessos: number;
}

/**
 * Consulta os acessos do RJ ja agregados na granularidade do NETRANK.
 *
 * A agregacao acontece no BigQuery, nao no cliente: filtrar e somar do lado do
 * servidor reduz o trafego de milhoes de linhas nacionais para alguns milhares
 * de linhas do Rio de Janeiro — que e o mesmo principio do §37 aplicado a uma
 * fonte remota.
 */
export function montarConsultaRj(
  tabela: string,
  mapa: MapaBdd,
  anoMinimo: number,
): string {
  const col = (campo: CampoBdd) => (mapa[campo] ? `\`${mapa[campo]}\`` : 'NULL');
  const agrupar = ['ano', 'mes', 'municipio', 'empresa', 'cnpj', 'grupo', 'tecnologia']
    .filter((c) => mapa[c as CampoBdd])
    .map((c) => `\`${mapa[c as CampoBdd]}\``)
    .join(', ');

  return `
    SELECT
      ${col('ano')}        AS ano,
      ${col('mes')}        AS mes,
      ${col('municipio')}  AS codigo_ibge,
      ${col('empresa')}    AS empresa,
      ${col('cnpj')}       AS cnpj,
      ${col('grupo')}      AS grupo,
      ${col('tecnologia')} AS tecnologia,
      SUM(${col('acessos')}) AS acessos
    FROM \`${PROJETO_BDD}.${DATASET_BDD}.${tabela}\`
    WHERE UPPER(CAST(${col('uf')} AS STRING)) = 'RJ'
      AND ${col('ano')} >= ${anoMinimo}
    GROUP BY ${agrupar}
  `;
}

export async function consultarRj(
  cliente: BigQuery,
  tabela: string,
  mapa: MapaBdd,
  anoMinimo: number,
): Promise<LinhaBdd[]> {
  const [linhas] = await cliente.query({
    query: montarConsultaRj(tabela, mapa, anoMinimo),
    location: 'US',
  });

  return (linhas as Array<Record<string, unknown>>).map((l) => ({
    ano: Number(l['ano']),
    mes: Number(l['mes']),
    codigoIbge: l['codigo_ibge'] === null || l['codigo_ibge'] === undefined
      ? null
      : String(l['codigo_ibge']).replace(/\D/g, ''),
    empresa: String(l['empresa'] ?? '').trim(),
    cnpj: l['cnpj'] ? String(l['cnpj']) : null,
    grupo: l['grupo'] ? String(l['grupo']) : null,
    tecnologia: l['tecnologia'] ? String(l['tecnologia']) : null,
    acessos: Number(l['acessos'] ?? 0),
  }));
}
