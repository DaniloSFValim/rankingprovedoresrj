/**
 * Validações matemáticas e de integridade do pipeline (§40, §44).
 *
 * Testes que verificam invariantes matemáticos dos dados:
 * - Somas de acessos por agregação
 * - Market share (deve somar ~100%)
 * - Hierarquia de concentração (CR1 ≤ CR3 ≤ CR5 ≤ CR10 ≤ 100)
 * - Distribuição por tecnologia (somam ao total)
 * - Anomalias de cobertura municipal (duplicatas de CNPJ)
 *
 * Nunca altera dados. Apenas valida e reporta.
 */

import {
  calcularConcentracao,
  construirRanking,
  marketShare,
  type Competencia,
  type ParticipanteMercado,
} from '@netrank/core';
import type { Banco } from '../warehouse/db.js';
import type { Alerta } from './qualidade.js';

/**
 * Resultado de validação matemática.
 */
export interface ResultadoValidacao {
  passou: boolean;
  tipo: string;
  severidade: 'INFO' | 'ATENCAO' | 'CRITICO';
  mensagem: string;
  detalhes?: Record<string, unknown>;
}

/**
 * Valida que a soma de acessos por empresa iguala o total do estado.
 *
 * Comparações:
 * - SUM(fato_acessos) em warehouse vs SUM(acessos por empresa)
 * - Desvios maiores que 0.01% sinalizam erro de carga ou normalização
 */
export function validarSomaAcessosEstado(
  db: Banco,
  competencia: Competencia,
): ResultadoValidacao {
  const resultadoTotal = db
    .prepare(
      `SELECT SUM(acessos) AS total
         FROM fato_acessos WHERE competencia = ?`,
    )
    .get(competencia) as { total: number | null };

  const resultadoPorEmpresa = db
    .prepare(
      `SELECT SUM(SUM(acessos)) AS total
         FROM fato_acessos WHERE competencia = ?
       GROUP BY empresa_id`,
    )
    .all(competencia) as Array<{ total: number }>;

  const totalDireto = resultadoTotal.total ?? 0;
  const totalAgregado = resultadoPorEmpresa.reduce((s, r) => s + r.total, 0);

  const desvio = totalDireto > 0 ? Math.abs(totalAgregado - totalDireto) / totalDireto : 0;
  const passou = desvio < 0.0001; // 0.01%

  return {
    passou,
    tipo: 'soma_acessos_estado',
    severidade: desvio > 0.01 ? 'CRITICO' : 'ATENCAO',
    mensagem: passou
      ? `✓ Soma de acessos validada: ${totalDireto.toLocaleString('pt-BR')} (desvio: ${(desvio * 100).toFixed(4)}%)`
      : `✗ Desvio na soma de acessos: esperado ${totalDireto}, obtido ${totalAgregado} (desvio: ${(desvio * 100).toFixed(2)}%)`,
    detalhes: {
      totalDireto,
      totalAgregado,
      desvioPercentual: desvio * 100,
    },
  };
}

/**
 * Valida que market shares somam aproximadamente 100%.
 *
 * Tolerância: 99.5% a 100.5% (arredondamentos)
 */
export function validarSomaMarketShare(
  db: Banco,
  competencia: Competencia,
): ResultadoValidacao {
  const empresas = db
    .prepare(
      `SELECT empresa_id, SUM(acessos) AS acessos
         FROM fato_acessos WHERE competencia = ?
       GROUP BY empresa_id`,
    )
    .all(competencia) as Array<{ empresa_id: string; acessos: number }>;

  const total = empresas.reduce((s, e) => s + e.acessos, 0);
  if (total === 0) {
    return {
      passou: false,
      tipo: 'soma_market_share',
      severidade: 'CRITICO',
      mensagem: 'Sem dados de acessos para competência',
    };
  }

  const somaMarketShare = empresas
    .map((e) => marketShare(e.acessos, total))
    .reduce((s, ms) => s + ms, 0);

  const passou = somaMarketShare >= 99.5 && somaMarketShare <= 100.5;

  return {
    passou,
    tipo: 'soma_market_share',
    severidade: passou ? 'INFO' : 'ATENCAO',
    mensagem: passou
      ? `✓ Market shares somam ${somaMarketShare.toFixed(2)}%`
      : `✗ Soma de market shares fora da tolerância: ${somaMarketShare.toFixed(2)}%`,
    detalhes: {
      somaPercentual: somaMarketShare,
      empresas: empresas.length,
      totalAcessos: total,
    },
  };
}

/**
 * Valida hierarquia de concentração: CR1 ≤ CR3 ≤ CR5 ≤ CR10 ≤ 100.
 *
 * Se violated, indica erro na cálculo de ranking ou concentração.
 */
export function validarHierarquiaConcentracao(
  db: Banco,
  competencia: Competencia,
): ResultadoValidacao {
  const empresas = db
    .prepare(
      `SELECT empresa_id, SUM(acessos) AS acessos
         FROM fato_acessos WHERE competencia = ?
       GROUP BY empresa_id`,
    )
    .all(competencia) as Array<{ empresa_id: string; acessos: number }>;

  const participantes: ParticipanteMercado[] = empresas.map((e) => ({
    empresaId: e.empresa_id,
    acessos: e.acessos,
  }));

  const conc = calcularConcentracao(participantes);
  if (!conc) {
    return {
      passou: false,
      tipo: 'hierarquia_concentracao',
      severidade: 'CRITICO',
      mensagem: 'Erro ao calcular indicadores de concentração',
    };
  }

  const valoresOrdenados = [
    { nome: 'CR1', valor: conc.cr1 },
    { nome: 'CR3', valor: conc.cr3 },
    { nome: 'CR5', valor: conc.cr5 },
    { nome: 'CR10', valor: conc.cr10 },
    { nome: '100%', valor: 100 },
  ];

  let passou = true;
  const violacoes: string[] = [];

  for (let i = 0; i < valoresOrdenados.length - 1; i++) {
    const atual = valoresOrdenados[i];
    const proximo = valoresOrdenados[i + 1];
    if (atual.valor > proximo.valor) {
      passou = false;
      violacoes.push(
        `${atual.nome} (${atual.valor.toFixed(2)}%) > ${proximo.nome} (${proximo.valor.toFixed(2)}%)`,
      );
    }
  }

  return {
    passou,
    tipo: 'hierarquia_concentracao',
    severidade: passou ? 'INFO' : 'CRITICO',
    mensagem: passou
      ? `✓ Hierarquia de concentração válida: CR1=${conc.cr1.toFixed(2)}%, CR3=${conc.cr3.toFixed(2)}%, CR5=${conc.cr5.toFixed(2)}%, CR10=${conc.cr10.toFixed(2)}%`
      : `✗ Violações na hierarquia: ${violacoes.join('; ')}`,
    detalhes: {
      cr1: conc.cr1,
      cr3: conc.cr3,
      cr5: conc.cr5,
      cr10: conc.cr10,
      hhi: conc.hhi,
      violacoes,
    },
  };
}

/**
 * Detecta anomalias de cobertura municipal - quando um provedor
 * tem presença em TODOS os 92 municípios (padrão anormal).
 *
 * Normal: prestadoras regionais em 1-80 municípios.
 * Anormal: presença em 92 (pode indicar consolidação de registros).
 */
export function detectarAnomaliasCoberturaMunicipal(
  db: Banco,
  competencia: Competencia,
): ResultadoValidacao {
  const totalMunicipios = (
    db
      .prepare('SELECT COUNT(DISTINCT codigo_ibge) AS total FROM municipios')
      .get() as { total: number }
  ).total;

  const coberturaPorEmpresa = db
    .prepare(
      `SELECT empresa_id, COUNT(DISTINCT codigo_ibge) AS municipios
         FROM fato_acessos WHERE competencia = ?
       GROUP BY empresa_id
       HAVING municipios = ?`,
    )
    .all(competencia, totalMunicipios) as Array<{ empresa_id: string; municipios: number }>;

  const passou = coberturaPorEmpresa.length === 0;

  return {
    passou,
    tipo: 'anomalia_cobertura_municipal',
    severidade: passou ? 'INFO' : 'ATENCAO',
    mensagem: passou
      ? `✓ Nenhuma prestadora anormalmente presente em todos os ${totalMunicipios} municípios`
      : `✗ ${coberturaPorEmpresa.length} prestadora(s) com presença em TODOS os ${totalMunicipios} municípios (anomalia de consolidação?)`,
    detalhes: {
      empresasAnomalo: coberturaPorEmpresa.map((e) => e.empresa_id),
      totalMunicipios,
    },
  };
}

/**
 * Detecta duplicatas de nomes com CNPJs distintos.
 *
 * Exemplos:
 * - CLARO com 2 CNPJs
 * - Leste Telecom com 4 CNPJs
 * - OI com 2 CNPJs
 */
export function detectarDuplicatasNomes(db: Banco, competencia: Competencia): ResultadoValidacao {
  const empresasNormalizadas = db
    .prepare(
      `SELECT nome_normalizado, COUNT(DISTINCT id) AS cnpjs_distintos
         FROM empresas
        WHERE id IN (
          SELECT DISTINCT empresa_id FROM fato_acessos WHERE competencia = ?
        )
       GROUP BY nome_normalizado
       HAVING cnpjs_distintos > 1`,
    )
    .all(competencia) as Array<{ nome_normalizado: string; cnpjs_distintos: number }>;

  const passou = empresasNormalizadas.length === 0;

  return {
    passou,
    tipo: 'duplicatas_nome_cnpj',
    severidade: passou ? 'INFO' : 'ATENCAO',
    mensagem: passou
      ? `✓ Nenhuma duplicata de nome com CNPJs distintos`
      : `✗ ${empresasNormalizadas.length} nome(s) com múltiplos CNPJs: ${empresasNormalizadas.map((e) => `${e.nome_normalizado} (${e.cnpjs_distintos} CNPJs)`).join(', ')}`,
    detalhes: {
      duplicatas: empresasNormalizadas,
    },
  };
}

/**
 * Executa todas as validações matemáticas.
 *
 * Retorna array de resultados com detalhes de cada teste.
 */
export function executarValidacoesMathematicas(
  db: Banco,
  competencia: Competencia,
): ResultadoValidacao[] {
  return [
    validarSomaAcessosEstado(db, competencia),
    validarSomaMarketShare(db, competencia),
    validarHierarquiaConcentracao(db, competencia),
    detectarAnomaliasCoberturaMunicipal(db, competencia),
    detectarDuplicatasNomes(db, competencia),
  ];
}

/**
 * Converte resultados de validação em alertas para persistência.
 */
export function converterValidacoesEmAlertas(
  validacoes: ResultadoValidacao[],
  competencia: Competencia,
): Alerta[] {
  return validacoes
    .filter((v) => !v.passou)
    .map((v) => ({
      competencia,
      severidade: v.severidade,
      tipo: v.tipo,
      entidade: null,
      mensagem: v.mensagem,
    }));
}
