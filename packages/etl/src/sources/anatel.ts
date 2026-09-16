/**
 * Adaptador da fonte Anatel — Acessos de Banda Larga Fixa (SCM).
 *
 * ATENCAO (leia antes de confiar): o layout dos arquivos abertos da Anatel muda
 * entre safras — colunas sao renomeadas, acentuadas ou reordenadas. Por isso
 * NAO ha acesso posicional a colunas em lugar nenhum deste pipeline. Toda
 * coluna e resolvida por nome, via lista de sinonimos, e um cabecalho que nao
 * resolva as colunas obrigatorias ABORTA a importacao com erro explicito.
 *
 * Falhar alto e deliberado: um pipeline que "se vira" com cabecalho
 * desconhecido produz ranking silenciosamente errado, que e o pior resultado
 * possivel para este produto.
 */

import { canonizarTexto } from '@netrank/core';

/**
 * Endereco do arquivo de acessos de banda larga fixa.
 *
 * CONFIRMADO contra o servidor da Anatel — nao e deducao. A descoberta por
 * catalogo falhou repetidamente (API do dados.gov.br exige chave de
 * Administrador de Organizacao; o inventario publico quase nunca traz link
 * direto), e este endereco foi obtido por sondagem e validado na origem.
 *
 * O arquivo nao e particionado por ano: e a base completa, com todo o
 * historico. Por isso nao ha logica de selecao de safra aplicada a ele.
 *
 * Se um dia parar de responder, `npm run etl -- sondar` testa as variacoes
 * conhecidas e relata quais existem.
 */
export const URL_ACESSOS_BANDA_LARGA_FIXA =
  'https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/acessos_banda_larga_fixa.zip';

/**
 * Arquivos do pacote da Anatel que NAO devem ser importados.
 *
 * O ZIP traz, para cada faixa de periodo, duas versoes do mesmo dado:
 *   Acessos_Banda_Larga_Fixa_2007-2010.csv          formato longo
 *   Acessos_Banda_Larga_Fixa_2007-2010_Colunas.csv  formato largo
 *
 * No formato largo cada competencia e uma COLUNA ("2007-03", "2007-06", ...),
 * e a mesma informacao ja esta no formato longo. Importar os dois duplicaria
 * integralmente os acessos — e um ranking com o dobro dos numeros reais nao
 * parece errado a olho nu, o que torna esse erro especialmente perigoso.
 */
export function ehArquivoIgnorado(caminho: string): boolean {
  const nome = caminho.split(/[\\/]/).pop() ?? caminho;
  return /_colunas\.csv$/i.test(nome)
    // "_Total" e o agregado nacional (Ano, Mes, Acessos), sem UF nem empresa.
    // Nao sustenta nenhuma analise deste produto e nao deve ser importado.
    || /_total\.csv$/i.test(nome)
    || /dicionario|leia[- ]?me|readme/i.test(nome);
}

/**
 * Colunas que identificam QUEM presta o servico ou ONDE ele e prestado.
 *
 * Um arquivo sem nenhuma delas nao e uma safra com colunas renomeadas: e um
 * agregado. A distincao importa porque as duas situacoes pedem respostas
 * opostas — cabecalho desconhecido deve abortar a importacao, agregado deve
 * ser pulado.
 */
const CAMPOS_IDENTIFICADORES: readonly CampoAnatel[] = [
  'uf', 'municipio', 'codigoIbge', 'empresa', 'cnpj', 'grupoEconomico',
];

/**
 * Detecta arquivo de totais agregados pelo proprio cabecalho.
 *
 * Complementa a regra por nome de arquivo: a Anatel pode publicar outro
 * agregado com nome diferente, e depender so do nome deixaria a importacao
 * abortar por um arquivo que deveria ser simplesmente ignorado.
 *
 * O criterio e conservador: so considera agregado quando NENHUM identificador
 * de prestadora ou de territorio existe. Um arquivo granular sempre traz ao
 * menos um deles, mesmo que com outra grafia.
 */
export function ehCabecalhoAgregado(cabecalho: readonly string[]): boolean {
  const canonicas = new Set(cabecalho.map(canonizarTexto));
  const temIdentificador = CAMPOS_IDENTIFICADORES.some((campo) =>
    SINONIMOS[campo].some((sinonimo) => canonicas.has(sinonimo)),
  );
  return !temIdentificador;
}

/**
 * Faixa de anos coberta por um arquivo do pacote, lida do proprio nome.
 *
 * O pacote da Anatel e particionado por periodo:
 *   Acessos_Banda_Larga_Fixa_2007-2010.csv
 *   Acessos_Banda_Larga_Fixa_2023-2026.csv
 *
 * Saber a faixa antes de abrir o arquivo permite pular safras inteiras que
 * estao fora da janela pedida — o ganho vem de nao ler milhoes de linhas, e
 * nao de descartar dimensoes do dado.
 */
export function faixaDeAnos(caminho: string): { inicio: number; fim: number } | null {
  const nome = caminho.split(/[\\/]/).pop() ?? caminho;
  const intervalo = /(\d{4})\s*[-_a]\s*(\d{4})/.exec(nome);
  if (intervalo) {
    const inicio = Number(intervalo[1]);
    const fim = Number(intervalo[2]);
    if (inicio <= fim) return { inicio, fim };
  }
  const unico = /(?:^|[^\d])(19|20)(\d{2})(?:[^\d]|$)/.exec(nome);
  if (unico) {
    const ano = Number(`${unico[1]}${unico[2]}`);
    return { inicio: ano, fim: ano };
  }
  return null;
}

/**
 * Decide se vale abrir o arquivo, dada a janela de anos desejada.
 *
 * Arquivo sem faixa identificavel e SEMPRE processado: pular por nao entender
 * o nome perderia dados em silencio, que e pior do que ler demais.
 */
export function arquivoDentroDaJanela(caminho: string, anoMinimo: number): boolean {
  const faixa = faixaDeAnos(caminho);
  if (faixa === null) return true;
  return faixa.fim >= anoMinimo;
}

export const FONTE_ANATEL = {
  nome: 'Anatel — Agência Nacional de Telecomunicações',
  painel: 'https://informacoes.anatel.gov.br/paineis/acessos/banda-larga-fixa',
  portalDados: 'https://dados.gov.br/dados/conjuntos-dados/acessos-banda-larga-fixa',
  servico: 'SCM — Serviço de Comunicação Multimídia',
  licenca: 'Dados abertos governamentais (Lei 12.527/2011)',
} as const;

/** Campos que o NETRANK precisa extrair de cada linha bruta. */
export type CampoAnatel =
  | 'ano'
  | 'mes'
  | 'uf'
  | 'municipio'
  | 'codigoIbge'
  | 'empresa'
  | 'cnpj'
  | 'grupoEconomico'
  | 'tecnologia'
  | 'acessos';

/**
 * Sinonimos aceitos por campo, ja canonizados (sem acento, caixa alta).
 * Estender esta tabela e a forma suportada de acomodar novas safras da fonte.
 */
const SINONIMOS: Record<CampoAnatel, readonly string[]> = {
  ano: ['ANO'],
  mes: ['MES', 'MES REFERENCIA', 'MES DE REFERENCIA'],
  uf: ['UF', 'SIGLA UF', 'UNIDADE DA FEDERACAO'],
  municipio: ['MUNICIPIO', 'NOME MUNICIPIO', 'NO MUNICIPIO', 'NOME DO MUNICIPIO'],
  codigoIbge: [
    // "Codigo IBGE Municipio" e a grafia observada no arquivo real da Anatel.
    // A ausencia dela fazia 100% das linhas do RJ serem rejeitadas.
    'CODIGO IBGE MUNICIPIO', 'CODIGO IBGE', 'COD IBGE', 'CODIGO DO IBGE',
    'CO MUNICIPIO', 'CODIGO MUNICIPIO', 'ID MUNICIPIO', 'CODIGO DO MUNICIPIO',
    'COD MUNICIPIO IBGE', 'CODIGO IBGE DO MUNICIPIO',
  ],
  empresa: [
    'EMPRESA', 'PRESTADORA', 'NOME PRESTADORA', 'RAZAO SOCIAL', 'NO ENTIDADE',
  ],
  cnpj: ['CNPJ', 'CNPJ PRESTADORA', 'CNPJ ENTIDADE'],
  grupoEconomico: ['GRUPO ECONOMICO', 'GRUPO'],
  tecnologia: ['TECNOLOGIA', 'TIPO TECNOLOGIA', 'MEIO DE ACESSO', 'TECNOLOGIA ACESSO'],
  acessos: ['ACESSOS', 'QTDE ACESSOS', 'QUANTIDADE DE ACESSOS', 'QUANTIDADE ACESSOS'],
};

/** Campos sem os quais nenhum indicador do produto pode ser calculado. */
const OBRIGATORIOS: readonly CampoAnatel[] = [
  'ano', 'mes', 'uf', 'empresa', 'acessos',
];

export type MapaColunas = Partial<Record<CampoAnatel, string>>;

export class CabecalhoIncompativelError extends Error {
  constructor(
    readonly faltantes: readonly CampoAnatel[],
    readonly cabecalhoRecebido: readonly string[],
  ) {
    super(
      `Cabecalho da Anatel incompativel. Campos obrigatorios nao resolvidos: ` +
        `${faltantes.join(', ')}. Colunas recebidas: ${cabecalhoRecebido.join(' | ')}. ` +
        `Estenda SINONIMOS em packages/etl/src/sources/anatel.ts para acomodar esta safra.`,
    );
    this.name = 'CabecalhoIncompativelError';
  }
}

/**
 * Resolve o cabecalho real do arquivo para os campos do dominio.
 * Lanca `CabecalhoIncompativelError` se faltar campo obrigatorio.
 */
export function mapearCabecalho(cabecalho: readonly string[]): MapaColunas {
  const porCanonico = new Map<string, string>();
  for (const coluna of cabecalho) {
    porCanonico.set(canonizarTexto(coluna), coluna);
  }

  const mapa: MapaColunas = {};
  for (const [campo, sinonimos] of Object.entries(SINONIMOS) as Array<
    [CampoAnatel, readonly string[]]
  >) {
    for (const sinonimo of sinonimos) {
      const encontrada = porCanonico.get(sinonimo);
      if (encontrada !== undefined) {
        mapa[campo] = encontrada;
        break;
      }
    }
  }

  const faltantes = OBRIGATORIOS.filter((campo) => mapa[campo] === undefined);
  if (faltantes.length > 0) {
    throw new CabecalhoIncompativelError(faltantes, cabecalho);
  }
  return mapa;
}

/**
 * Converte o campo de acessos para inteiro.
 * A Anatel usa separador de milhar "." e decimal "," em algumas safras.
 * Valor nao numerico retorna null — a linha e contabilizada como rejeitada,
 * nunca convertida em zero (§5).
 */
export function interpretarAcessos(bruto: string | undefined): number | null {
  if (bruto === undefined) return null;
  const limpo = bruto.trim();
  if (limpo === '' || limpo === '-') return null;
  const numerico = Number(limpo.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(numerico) || numerico < 0) return null;
  return Math.round(numerico);
}

/** Normaliza o mes, que aparece como "1", "01" ou "Janeiro" conforme a safra. */
const MESES_POR_EXTENSO: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

export function interpretarMes(bruto: string | undefined): number | null {
  if (bruto === undefined) return null;
  const limpo = bruto.trim();
  if (limpo === '') return null;
  const numerico = Number(limpo);
  if (Number.isInteger(numerico) && numerico >= 1 && numerico <= 12) return numerico;
  const porExtenso = MESES_POR_EXTENSO[canonizarTexto(limpo)];
  return porExtenso ?? null;
}
