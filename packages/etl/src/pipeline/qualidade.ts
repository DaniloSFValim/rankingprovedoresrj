/**
 * Controle de qualidade (§40).
 *
 * Regra estrutural: este modulo NUNCA altera, corrige ou remove um registro.
 * Ele apenas observa e registra alertas. Correcao e decisao humana, tomada no
 * painel administrativo. Um pipeline que "conserta" sozinho uma variacao
 * anormal destroi justamente o sinal que o produto existe para mostrar.
 */

import {
  deslocarCompetencia,
  intervaloCompetencias,
  type Competencia,
} from '@netrank/core';
import type { Banco } from '../warehouse/db.js';
import type { ResultadoExtracao } from './extrair.js';

export type Severidade = 'INFO' | 'ATENCAO' | 'CRITICO';

export interface Alerta {
  competencia: Competencia | null;
  severidade: Severidade;
  tipo: string;
  entidade: string | null;
  mensagem: string;
}

/** Limiar de variacao mensal a partir do qual um provedor e sinalizado (§40). */
export const LIMIAR_VARIACAO_ANORMAL = 30;

/** Piso de acessos para sinalizar variacao: evita ruido de provedores minusculos. */
export const PISO_ACESSOS_PARA_ALERTA = 500;

function totalPorEmpresa(
  db: Banco,
  competencia: Competencia,
): Map<string, number> {
  const linhas = db
    .prepare(
      `SELECT empresa_id, SUM(acessos) AS total
         FROM fato_acessos WHERE competencia = ? GROUP BY empresa_id`,
    )
    .all(competencia) as Array<{ empresa_id: string; total: number }>;
  return new Map(linhas.map((l) => [l.empresa_id, l.total]));
}

/**
 * Compara a competencia recem-carregada contra a anterior e produz alertas.
 * Retorna lista vazia quando nao ha base de comparacao — a primeira carga do
 * historico nao pode gerar alerta de variacao.
 */
export function auditarCompetencia(db: Banco, competencia: Competencia): Alerta[] {
  const alertas: Alerta[] = [];
  const anterior = deslocarCompetencia(competencia, -1);

  const atual = totalPorEmpresa(db, competencia);
  const antes = totalPorEmpresa(db, anterior);

  if (atual.size === 0) {
    alertas.push({
      competencia,
      severidade: 'CRITICO',
      tipo: 'competencia_vazia',
      entidade: null,
      mensagem: `Competencia ${competencia} nao possui nenhum registro apos o filtro RJ.`,
    });
    return alertas;
  }

  if (antes.size === 0) return alertas;

  for (const [empresaId, totalAtual] of atual) {
    const totalAnterior = antes.get(empresaId);

    if (totalAnterior === undefined) {
      alertas.push({
        competencia,
        severidade: 'INFO',
        tipo: 'empresa_nova',
        entidade: empresaId,
        mensagem:
          `Provedor ausente em ${anterior} aparece em ${competencia} ` +
          `com ${totalAtual.toLocaleString('pt-BR')} acessos.`,
      });
      continue;
    }

    if (totalAnterior < PISO_ACESSOS_PARA_ALERTA) continue;
    const variacao = ((totalAtual - totalAnterior) / totalAnterior) * 100;
    if (Math.abs(variacao) >= LIMIAR_VARIACAO_ANORMAL) {
      alertas.push({
        competencia,
        severidade: Math.abs(variacao) >= 100 ? 'CRITICO' : 'ATENCAO',
        tipo: 'variacao_anormal',
        entidade: empresaId,
        mensagem:
          `Variacao de ${variacao.toFixed(1)}% entre ${anterior} e ${competencia} ` +
          `(${totalAnterior.toLocaleString('pt-BR')} -> ${totalAtual.toLocaleString('pt-BR')} acessos). ` +
          `Registro preservado sem alteracao; requer conferencia manual na fonte.`,
      });
    }
  }

  for (const [empresaId, totalAnterior] of antes) {
    if (!atual.has(empresaId) && totalAnterior >= PISO_ACESSOS_PARA_ALERTA) {
      alertas.push({
        competencia,
        severidade: 'ATENCAO',
        tipo: 'empresa_desaparecida',
        entidade: empresaId,
        mensagem:
          `Provedor com ${totalAnterior.toLocaleString('pt-BR')} acessos em ${anterior} ` +
          `nao consta em ${competencia}. Pode indicar saida do mercado, ` +
          `incorporacao ou mudanca de grafia na fonte.`,
      });
    }
  }

  return alertas;
}

/**
 * Detecta lacunas na serie historica carregada.
 *
 * Uma competencia ausente no meio da serie e invisivel num grafico: a linha
 * simplesmente liga o mes anterior ao seguinte, e um buraco de doze meses
 * vira um segmento reto que parece continuidade. E o tipo de erro que nao
 * aparece olhando a tela — so aparece contando os meses.
 *
 * Causas possiveis: safra que falhou na importacao, arquivo ausente na fonte,
 * ou periodo realmente nao publicado pela Anatel. O pipeline nao adivinha
 * qual e — apenas avisa, e jamais preenche a lacuna por interpolacao.
 */
export function detectarLacunas(db: Banco): Competencia[] {
  const presentes = (
    db
      .prepare('SELECT DISTINCT competencia FROM fato_acessos ORDER BY competencia')
      .all() as Array<{ competencia: Competencia }>
  ).map((r) => r.competencia);

  if (presentes.length < 2) return [];

  const conjunto = new Set(presentes);
  return intervaloCompetencias(presentes[0]!, presentes[presentes.length - 1]!)
    .filter((c) => !conjunto.has(c));
}

export function auditarLacunas(db: Banco): Alerta[] {
  const lacunas = detectarLacunas(db);
  if (lacunas.length === 0) return [];

  return [{
    competencia: null,
    severidade: 'CRITICO',
    tipo: 'lacuna_na_serie',
    entidade: null,
    mensagem:
      `${lacunas.length} competencia(s) ausente(s) no meio da serie: ` +
      `${lacunas.join(', ')}. Series temporais e variacoes que atravessem essas ` +
      `datas ficam distorcidas. Verifique se a safra correspondente falhou na ` +
      `importacao ou se o periodo nao consta na fonte.`,
  }];
}

/** Alertas derivados da propria extracao, antes da carga. */
export function auditarExtracao(extracao: ResultadoExtracao): Alerta[] {
  const alertas: Alerta[] = [];
  const { estatisticas } = extracao;

  if (estatisticas.linhasRj === 0) {
    alertas.push({
      competencia: null,
      severidade: 'CRITICO',
      tipo: 'sem_linhas_rj',
      entidade: null,
      mensagem:
        `Arquivo processado com ${estatisticas.linhasLidas} linhas e nenhuma ` +
        `com UF = RJ. Verifique se a safra usa outra grafia para a coluna de UF.`,
    });
  }

  const taxaRejeicao =
    estatisticas.linhasRj > 0
      ? (estatisticas.linhasRejeitadas / estatisticas.linhasRj) * 100
      : 0;
  if (taxaRejeicao >= 5) {
    alertas.push({
      competencia: null,
      severidade: taxaRejeicao >= 20 ? 'CRITICO' : 'ATENCAO',
      tipo: 'taxa_rejeicao_alta',
      entidade: null,
      mensagem:
        `${taxaRejeicao.toFixed(1)}% das linhas do RJ foram rejeitadas. ` +
        `Motivos: ${JSON.stringify(estatisticas.motivosRejeicao)}.`,
    });
  }

  for (const [rotulo, ocorrencias] of extracao.tecnologiasNaoMapeadas) {
    alertas.push({
      competencia: null,
      severidade: 'INFO',
      tipo: 'tecnologia_nao_mapeada',
      entidade: rotulo,
      mensagem:
        `Rotulo de tecnologia "${rotulo}" (${ocorrencias} ocorrencias) nao casou ` +
        `com nenhuma regra e foi classificado como OUTRAS.`,
    });
  }

  // Empresas identificadas apenas por nome sao as candidatas a erro de fusao (§8).
  const semCnpj = [...extracao.empresas.values()].filter(
    (e) => e.origem === 'NOME_CANONICO',
  );
  if (semCnpj.length > 0) {
    alertas.push({
      competencia: null,
      severidade: 'INFO',
      tipo: 'identidade_por_nome',
      entidade: null,
      mensagem:
        `${semCnpj.length} provedores foram identificados por nome canonico por ` +
        `ausencia de CNPJ na fonte. Agrupamento heuristico sujeito a revisao manual.`,
    });
  }

  return alertas;
}

export function persistirAlertas(
  db: Banco,
  execucaoId: number,
  alertas: readonly Alerta[],
): void {
  const inserir = db.prepare(
    `INSERT INTO alertas_qualidade
       (execucao_id, competencia, severidade, tipo, entidade, mensagem, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const agora = new Date().toISOString();
  const transacao = db.transaction(() => {
    for (const a of alertas) {
      inserir.run(execucaoId, a.competencia, a.severidade, a.tipo, a.entidade, a.mensagem, agora);
    }
  });
  transacao();
}
