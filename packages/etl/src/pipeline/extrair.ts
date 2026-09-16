/**
 * Etapa COLETA -> DADOS BRUTOS -> VALIDACAO -> NORMALIZACAO do pipeline (§6).
 *
 * O filtro UF = RJ e aplicado linha a linha, durante o streaming, antes de
 * qualquer alocacao de estrutura (§37). Um arquivo nacional de centenas de MB
 * e reduzido ao Rio de Janeiro sem nunca ser materializado em memoria.
 */

import fs from 'node:fs';
import { parse } from 'csv-parse';
import iconv from 'iconv-lite';
import {
  asCompetencia,
  classificarTecnologia,
  resolverIdentidadeEmpresa,
  type Competencia,
  type OrigemIdentidade,
  type Tecnologia,
} from '@netrank/core';
import { PREFIXO_IBGE_RJ, UF_ALVO } from '../config.js';
import {
  ehCabecalhoAgregado,
  interpretarAcessos,
  interpretarMes,
  mapearCabecalho,
  type MapaColunas,
} from '../sources/anatel.js';

export interface RegistroAgregado {
  competencia: Competencia;
  codigoIbge: string;
  empresaId: string;
  tecnologia: Tecnologia;
  acessos: number;
}

export interface EmpresaDescoberta {
  empresaId: string;
  chaveNome: string;
  nomeOriginalAnatel: string;
  cnpj: string | null;
  grupoEconomico: string | null;
  origem: OrigemIdentidade;
}

export interface MunicipioDescoberto {
  codigoIbge: string;
  nome: string;
}

export interface ResultadoExtracao {
  /** Coluna real do arquivo ligada a cada campo do dominio (diagnostico). */
  mapaColunas?: MapaColunas;
  /**
   * true quando o arquivo e um agregado sem prestadora nem territorio.
   * Nao e erro: e um arquivo que este produto nao consome.
   */
  agregadoIgnorado?: boolean;
  registros: RegistroAgregado[];
  empresas: Map<string, EmpresaDescoberta>;
  municipios: Map<string, MunicipioDescoberto>;
  competencias: Set<Competencia>;
  /** Rotulos de tecnologia que cairam em OUTRAS — insumo do controle de qualidade (§40). */
  tecnologiasNaoMapeadas: Map<string, number>;
  estatisticas: {
    linhasLidas: number;
    linhasRj: number;
    linhasRejeitadas: number;
    motivosRejeicao: Record<string, number>;
  };
}

export interface OpcoesExtracao {
  /** Overrides manuais de identidade de empresa (chaveNome -> empresaId). */
  overrides?: ReadonlyMap<string, string>;
  /** Codificacao do arquivo. Safras antigas da Anatel usam latin1. */
  encoding?: 'utf8' | 'latin1';
  /** Delimitador. Detectado automaticamente quando omitido. */
  delimitador?: string;
}

/**
 * Detecta a codificacao do arquivo.
 *
 * Safras antigas da Anatel vem em latin1. Ler latin1 como UTF-8 corrompe
 * acentos nos nomes das empresas — e nomes corrompidos quebram a normalizacao,
 * fatiando uma mesma prestadora em varias linhas do ranking. Por isso a
 * deteccao e automatica, e nao um sinalizador que alguem esquece de passar.
 */
export function detectarEncoding(caminho: string): 'utf8' | 'latin1' {
  const amostra = Buffer.alloc(256 * 1024);
  const descritor = fs.openSync(caminho, 'r');
  let lidos = 0;
  try {
    lidos = fs.readSync(descritor, amostra, 0, amostra.length, 0);
  } finally {
    fs.closeSync(descritor);
  }
  const fatia = amostra.subarray(0, lidos);
  // U+FFFD so aparece quando a sequencia nao e UTF-8 valida.
  const comoUtf8 = fatia.toString('utf8');
  return comoUtf8.includes('\uFFFD') ? 'latin1' : 'utf8';
}

/** Detecta o delimitador pela primeira linha, entre ';' ',' e tab. */
export async function detectarDelimitador(
  caminho: string,
  encoding: 'utf8' | 'latin1' = 'utf8',
): Promise<string> {
  const stream = fs.createReadStream(caminho, { end: 64 * 1024 });
  const texto = await new Promise<string>((resolve, reject) => {
    const pedacos: Buffer[] = [];
    stream.on('data', (p) => pedacos.push(p as Buffer));
    stream.on('end', () => resolve(iconv.decode(Buffer.concat(pedacos), encoding)));
    stream.on('error', reject);
  });
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? '';
  const candidatos = [';', ',', '\t'] as const;
  let melhor: string = ';';
  let maiorContagem = -1;
  for (const c of candidatos) {
    const contagem = primeiraLinha.split(c).length - 1;
    if (contagem > maiorContagem) {
      maiorContagem = contagem;
      melhor = c;
    }
  }
  return melhor;
}

function registrarRejeicao(resultado: ResultadoExtracao, motivo: string): void {
  resultado.estatisticas.linhasRejeitadas += 1;
  resultado.estatisticas.motivosRejeicao[motivo] =
    (resultado.estatisticas.motivosRejeicao[motivo] ?? 0) + 1;
}

/**
 * Le um CSV da Anatel e devolve os fatos do RJ ja agregados por
 * (competencia, municipio, empresa, tecnologia).
 *
 * A agregacao acontece durante a leitura porque o arquivo da Anatel e mais
 * granular que o NETRANK (faixa de velocidade, tipo de pessoa, produto):
 * varias linhas de origem colapsam em um unico fato.
 */
export async function extrairRj(
  caminhoCsv: string,
  opcoes: OpcoesExtracao = {},
): Promise<ResultadoExtracao> {
  const encoding = opcoes.encoding ?? detectarEncoding(caminhoCsv);
  const delimitador = opcoes.delimitador ?? (await detectarDelimitador(caminhoCsv, encoding));
  const overrides = opcoes.overrides ?? new Map<string, string>();

  const resultado: ResultadoExtracao = {
    registros: [],
    empresas: new Map(),
    municipios: new Map(),
    competencias: new Set(),
    tecnologiasNaoMapeadas: new Map(),
    estatisticas: { linhasLidas: 0, linhasRj: 0, linhasRejeitadas: 0, motivosRejeicao: {} },
  };

  /** Agregador: chave composta -> acessos somados. */
  const acumulador = new Map<string, RegistroAgregado>();
  let mapa: MapaColunas | null = null;

  const leitor = fs
    .createReadStream(caminhoCsv)
    .pipe(iconv.decodeStream(encoding))
    .pipe(
      parse({
        delimiter: delimitador,
        columns: (cabecalho: string[]) => {
          // Agregado sem prestadora nem territorio nao e cabecalho
          // desconhecido: e arquivo que este produto nao consome. Abortar por
          // causa dele descartaria uma importacao inteira ja bem-sucedida.
          if (ehCabecalhoAgregado(cabecalho)) {
            resultado.agregadoIgnorado = true;
            return cabecalho;
          }
          // Lanca CabecalhoIncompativelError se faltar campo obrigatorio.
          mapa = mapearCabecalho(cabecalho);
          resultado.mapaColunas = mapa;
          return cabecalho;
        },
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
        bom: true,
      }),
    );

  for await (const linha of leitor as AsyncIterable<Record<string, string>>) {
    if (resultado.agregadoIgnorado) break;
    resultado.estatisticas.linhasLidas += 1;
    const cols = mapa!;

    // --- filtro RJ o mais cedo possivel (§37) -------------------------------
    const uf = (linha[cols.uf!] ?? '').trim().toUpperCase();
    if (uf !== UF_ALVO) continue;
    resultado.estatisticas.linhasRj += 1;

    // --- validacao ----------------------------------------------------------
    const ano = Number((linha[cols.ano!] ?? '').trim());
    const mes = interpretarMes(linha[cols.mes!]);
    if (!Number.isInteger(ano) || mes === null) {
      registrarRejeicao(resultado, 'competencia_invalida');
      continue;
    }

    const acessos = interpretarAcessos(linha[cols.acessos!]);
    if (acessos === null) {
      registrarRejeicao(resultado, 'acessos_nao_numerico');
      continue;
    }

    const nomeEmpresa = (linha[cols.empresa!] ?? '').trim();
    if (nomeEmpresa === '') {
      registrarRejeicao(resultado, 'empresa_sem_nome');
      continue;
    }

    const codigoIbgeBruto = cols.codigoIbge ? (linha[cols.codigoIbge] ?? '').trim() : '';
    const codigoIbge = codigoIbgeBruto.replace(/\D/g, '');
    // Sem municipio identificavel o registro nao sustenta nenhuma analise
    // territorial; e mantido fora do fato e contabilizado como rejeitado.
    if (codigoIbge.length !== 7 || !codigoIbge.startsWith(PREFIXO_IBGE_RJ)) {
      registrarRejeicao(resultado, 'codigo_ibge_invalido');
      continue;
    }

    // --- normalizacao -------------------------------------------------------
    const competencia = asCompetencia(ano, mes);
    const cnpjBruto = cols.cnpj ? (linha[cols.cnpj] ?? '').trim() : null;
    const identidade = resolverIdentidadeEmpresa(
      { nomeAnatel: nomeEmpresa, cnpj: cnpjBruto },
      overrides,
    );
    const rotuloTecnologia = cols.tecnologia ? (linha[cols.tecnologia] ?? '').trim() : '';
    const tecnologia = classificarTecnologia(rotuloTecnologia);
    if (tecnologia === 'OUTRAS' && rotuloTecnologia !== '') {
      resultado.tecnologiasNaoMapeadas.set(
        rotuloTecnologia,
        (resultado.tecnologiasNaoMapeadas.get(rotuloTecnologia) ?? 0) + 1,
      );
    }

    resultado.competencias.add(competencia);

    if (!resultado.empresas.has(identidade.empresaId)) {
      resultado.empresas.set(identidade.empresaId, {
        empresaId: identidade.empresaId,
        chaveNome: identidade.empresaId.startsWith('nome:')
          ? identidade.empresaId.slice(5)
          : nomeEmpresa,
        nomeOriginalAnatel: nomeEmpresa,
        cnpj: cnpjBruto && cnpjBruto !== '' ? cnpjBruto : null,
        grupoEconomico: cols.grupoEconomico
          ? (linha[cols.grupoEconomico] ?? '').trim() || null
          : null,
        origem: identidade.origem,
      });
    }

    if (cols.municipio && !resultado.municipios.has(codigoIbge)) {
      resultado.municipios.set(codigoIbge, {
        codigoIbge,
        nome: (linha[cols.municipio] ?? '').trim(),
      });
    }

    // --- agregacao ----------------------------------------------------------
    const chave = `${competencia}|${codigoIbge}|${identidade.empresaId}|${tecnologia}`;
    const existente = acumulador.get(chave);
    if (existente) {
      existente.acessos += acessos;
    } else {
      acumulador.set(chave, {
        competencia,
        codigoIbge,
        empresaId: identidade.empresaId,
        tecnologia,
        acessos,
      });
    }
  }

  resultado.registros = [...acumulador.values()];
  return resultado;
}

/** Conveniencia para testes: extrai a partir de um CSV em memoria. */
export async function extrairRjDeTexto(
  conteudo: string,
  opcoes: OpcoesExtracao = {},
): Promise<ResultadoExtracao> {
  const tmp = `${process.env['TMPDIR'] ?? '/tmp'}/netrank-${Date.now()}-${Math.random().toString(36).slice(2)}.csv`;
  fs.writeFileSync(tmp, conteudo, 'utf8');
  try {
    return await extrairRj(tmp, opcoes);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
