/**
 * Geração de relatório estruturado de qualidade (§40, §44).
 *
 * Produz data-quality-report.json com:
 * - Resultados de validações matemáticas
 * - Alertas de anomalias e lacunas
 * - Estatísticas da competência
 * - Rastreabilidade completa (fonte, download, pipeline)
 */

import fs from 'node:fs';
import path from 'node:path';
import { rotularCompetencia, type Competencia } from '@netrank/core';
import type { Banco } from '../warehouse/db.js';
import type { Alerta } from './qualidade.js';
import { executarValidacoesMathematicas, type ResultadoValidacao } from './validacoes-matematicas.js';

export interface RelatorioQualidade {
  metadados: {
    geradoEm: string;
    competencia: Competencia;
    competenciaLabel: string;
    pipelineVersao: string;
    commitHash: string;
  };

  fonte: {
    anatel: {
      recurso: string;
      downloadEm: string;
      tamanhoBytes: number;
      sha256: string;
    };
  };

  validacoes: {
    matematicas: Array<{
      tipo: string;
      passou: boolean;
      severidade: string;
      mensagem: string;
      detalhes?: Record<string, unknown>;
    }>;
  };

  alertas: {
    total: number;
    porSeveridade: {
      critico: number;
      atencao: number;
      info: number;
    };
    lista: Array<{
      tipo: string;
      severidade: string;
      entidade: string | null;
      mensagem: string;
    }>;
  };

  estatisticas: {
    totalAcessos: number;
    totalEmpresas: number;
    totalMunicipios: number;
    empresasNovas: number;
    empresasDesaparecidas: number;
    variacaoMensalMediana: number | null;
  };

  lacunas: Competencia[];

  status: 'PASSED' | 'WARNING' | 'FAILED' | 'REVIEW';
  statusExplicacao: string;
}

/**
 * Carrega informações da fonte Anatel (se disponível em .env ou meta).
 */
function carregarMetadadosFonte(): {
  recurso: string;
  downloadEm: string;
  tamanhoBytes: number;
  sha256: string;
} {
  // TODO: Integrar com pipeline baixar.ts para obter metadados reais
  return {
    recurso: 'https://dados.gov.br/api/...', // Placeholder
    downloadEm: new Date().toISOString(),
    tamanhoBytes: 0,
    sha256: 'pending',
  };
}

/**
 * Calcula variação mediana entre competências.
 */
function calcularVariacaoMediana(db: Banco, competenciaAtual: Competencia): number | null {
  // Query: pega variações percentuais de todas empresas
  // Retorna mediana
  const variacoes = db
    .prepare(
      `SELECT
         ((SUM(CASE WHEN c.competencia = ? THEN c.acessos ELSE 0 END) -
           SUM(CASE WHEN c.competencia = date((?) || '-01') THEN c.acessos ELSE 0 END)) /
          NULLIF(SUM(CASE WHEN c.competencia = date((?) || '-01') THEN c.acessos ELSE 0 END), 0)) * 100 AS variacao
       FROM fato_acessos c
       GROUP BY c.empresa_id`,
    )
    .all(competenciaAtual, competenciaAtual, competenciaAtual) as Array<{ variacao: number }>;

  if (variacoes.length === 0) return null;

  const sorted = variacoes.sort((a, b) => a.variacao - b.variacao);
  const meio = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[meio - 1]!.variacao + sorted[meio]!.variacao) / 2
    : sorted[meio]!.variacao;
}

/**
 * Gera relatório estruturado de qualidade.
 *
 * Este é o documento central de auditoria do pipeline - nele se baseia
 * qualquer decisão sobre reprocessamento, bloqueio ou publicação de dados.
 */
export function gerarRelatorioQualidade(
  db: Banco,
  competencia: Competencia,
  alertas: readonly Alerta[],
  commitHash: string,
  pipelineVersao: string,
  lacunas: readonly Competencia[],
): RelatorioQualidade {
  // Validações matemáticas
  const validacoesMath = executarValidacoesMathematicas(db, competencia);

  // Contadores de alertas
  const alertasCriticos = alertas.filter((a) => a.severidade === 'CRITICO').length;
  const alertasAtencao = alertas.filter((a) => a.severidade === 'ATENCAO').length;
  const alertasInfo = alertas.filter((a) => a.severidade === 'INFO').length;

  // Estatísticas
  const totalAcessos =
    (
      db
        .prepare('SELECT SUM(acessos) AS total FROM fato_acessos WHERE competencia = ?')
        .get(competencia) as { total: number | null }
    ).total ?? 0;

  const totalEmpresas = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT empresa_id) AS total
           FROM fato_acessos WHERE competencia = ?`,
      )
      .get(competencia) as { total: number }
  ).total;

  const totalMunicipios = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT codigo_ibge) AS total
           FROM fato_acessos WHERE competencia = ?`,
      )
      .get(competencia) as { total: number }
  ).total;

  const empresasNovas = alertas.filter((a) => a.tipo === 'empresa_nova').length;
  const empresasDesaparecidas = alertas.filter((a) => a.tipo === 'empresa_desaparecida').length;

  // Determinar status
  let status: 'PASSED' | 'WARNING' | 'FAILED' | 'REVIEW' = 'PASSED';
  let statusExplicacao = 'Todas as validações passaram sem alertas críticos.';

  const validacoesFalhadas = validacoesMath.filter((v) => !v.passou);
  if (alertasCriticos > 0 || validacoesFalhadas.length > 0) {
    status = 'FAILED';
    statusExplicacao = `Falhas críticas: ${alertasCriticos} alertas críticos, ${validacoesFalhadas.length} validações matemáticas falhadas.`;
  } else if (alertasAtencao > 0) {
    status = 'WARNING';
    statusExplicacao = `${alertasAtencao} alertas de atenção requerem revisão manual.`;
  } else if (lacunas.length > 0) {
    status = 'REVIEW';
    statusExplicacao = `${lacunas.length} lacunas na série histórica. Verifique integridade temporal.`;
  }

  return {
    metadados: {
      geradoEm: new Date().toISOString(),
      competencia,
      competenciaLabel: rotularCompetencia(competencia),
      pipelineVersao,
      commitHash,
    },

    fonte: {
      anatel: carregarMetadadosFonte(),
    },

    validacoes: {
      matematicas: validacoesMath.map((v) => {
        const resultado: {
          tipo: string;
          passou: boolean;
          severidade: string;
          mensagem: string;
          detalhes?: Record<string, unknown>;
        } = {
          tipo: v.tipo,
          passou: v.passou,
          severidade: v.severidade,
          mensagem: v.mensagem,
        };
        if (v.detalhes !== undefined) {
          resultado.detalhes = v.detalhes;
        }
        return resultado;
      }),
    },

    alertas: {
      total: alertas.length,
      porSeveridade: {
        critico: alertasCriticos,
        atencao: alertasAtencao,
        info: alertasInfo,
      },
      lista: alertas.map((a) => ({
        tipo: a.tipo,
        severidade: a.severidade,
        entidade: a.entidade,
        mensagem: a.mensagem,
      })),
    },

    estatisticas: {
      totalAcessos,
      totalEmpresas,
      totalMunicipios,
      empresasNovas,
      empresasDesaparecidas,
      variacaoMensalMediana: calcularVariacaoMediana(db, competencia),
    },

    lacunas: [...lacunas],

    status,
    statusExplicacao,
  };
}

/**
 * Escreve relatório de qualidade em JSON.
 */
export function salvarRelatorioQualidade(
  relatorio: RelatorioQualidade,
  caminhoDestino: string,
): void {
  const diretorio = path.dirname(caminhoDestino);
  if (!fs.existsSync(diretorio)) {
    fs.mkdirSync(diretorio, { recursive: true });
  }

  fs.writeFileSync(caminhoDestino, JSON.stringify(relatorio, null, 2), 'utf8');
  console.log(`✓ Relatório de qualidade salvo em: ${caminhoDestino}`);
  console.log(`  Status: ${relatorio.status}`);
  console.log(`  ${relatorio.statusExplicacao}`);
}
