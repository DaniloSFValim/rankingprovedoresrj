/**
 * CLI do pipeline NETRANK RJ.
 *
 *   npm run etl -- demo            gera fixture sintetica e roda o pipeline inteiro
 *   npm run etl -- importar <csv>  importa um arquivo real da Anatel
 *   npm run etl -- build           reconstroi os artefatos a partir do warehouse
 *   npm run etl -- status          mostra o estado do warehouse e os alertas
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { rotularCompetencia, type ProcedenciaDados } from '@netrank/core';
import { CAMINHOS } from './config.js';
import { escreverCsvDemo } from './fixtures/gerar-demo.js';
import { construirArtefatos } from './pipeline/artefatos.js';
import {
  carregar,
  competenciasArmazenadas,
  concluirExecucao,
  iniciarExecucao,
  registrarFonte,
} from './pipeline/carregar.js';
import { extrairRj } from './pipeline/extrair.js';
import {
  auditarCompetencia,
  auditarExtracao,
  persistirAlertas,
  type Alerta,
} from './pipeline/qualidade.js';
import { FONTE_ANATEL } from './sources/anatel.js';
import { abrirBanco, type Banco } from './warehouse/db.js';

function hashArquivo(caminho: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex');
}

function carregarOverrides(): Map<string, string> {
  if (!fs.existsSync(CAMINHOS.overrides)) return new Map();
  const bruto = JSON.parse(fs.readFileSync(CAMINHOS.overrides, 'utf8')) as Record<string, string>;
  return new Map(Object.entries(bruto));
}

interface OpcoesImportacao {
  url: string;
  dadosDemonstrativos: boolean;
  encoding?: 'utf8' | 'latin1';
}

async function importar(
  db: Banco,
  caminhoCsv: string,
  opcoes: OpcoesImportacao,
): Promise<void> {
  if (!fs.existsSync(caminhoCsv)) {
    throw new Error(`Arquivo nao encontrado: ${caminhoCsv}`);
  }

  const estatisticasArquivo = fs.statSync(caminhoCsv);
  const fonteId = registrarFonte(db, {
    nome: FONTE_ANATEL.nome,
    url: opcoes.url,
    arquivo: path.basename(caminhoCsv),
    hashSha256: hashArquivo(caminhoCsv),
    bytes: estatisticasArquivo.size,
    coletadoEm: estatisticasArquivo.mtime.toISOString(),
    dadosDemonstrativos: opcoes.dadosDemonstrativos,
  });
  const execucaoId = iniciarExecucao(db, fonteId);

  try {
    console.log(`[extrair] lendo ${caminhoCsv}`);
    const extracao = await extrairRj(caminhoCsv, {
      overrides: carregarOverrides(),
      ...(opcoes.encoding ? { encoding: opcoes.encoding } : {}),
    });

    const { estatisticas } = extracao;
    console.log(
      `[extrair] ${estatisticas.linhasLidas} linhas lidas | ` +
        `${estatisticas.linhasRj} no RJ | ${estatisticas.linhasRejeitadas} rejeitadas | ` +
        `${extracao.registros.length} fatos agregados`,
    );

    console.log(`[carregar] gravando ${extracao.competencias.size} competencia(s)`);
    carregar(db, extracao, execucaoId);

    const alertas: Alerta[] = [...auditarExtracao(extracao)];
    for (const competencia of [...extracao.competencias].sort()) {
      alertas.push(...auditarCompetencia(db, competencia));
    }
    persistirAlertas(db, execucaoId, alertas);

    const criticos = alertas.filter((a) => a.severidade === 'CRITICO');
    console.log(
      `[qualidade] ${alertas.length} alerta(s): ` +
        `${criticos.length} critico(s), ` +
        `${alertas.filter((a) => a.severidade === 'ATENCAO').length} atencao`,
    );
    for (const a of criticos) console.warn(`  [CRITICO] ${a.tipo}: ${a.mensagem}`);

    concluirExecucao(db, execucaoId, 'SUCESSO', estatisticas);
  } catch (erro) {
    concluirExecucao(
      db,
      execucaoId,
      'FALHA',
      { linhasLidas: 0, linhasRj: 0, linhasRejeitadas: 0, motivosRejeicao: {} },
      erro instanceof Error ? erro.message : String(erro),
    );
    throw erro;
  }
}

function build(db: Banco): void {
  const fonte = db
    .prepare(
      `SELECT f.nome, f.url, f.arquivo, f.coletado_em, f.dados_demonstrativos
         FROM fontes_dados f
         JOIN execucoes_importacao e ON e.fonte_id = f.id
        WHERE e.status = 'SUCESSO'
        ORDER BY e.concluido_em DESC LIMIT 1`,
    )
    .get() as
    | {
        nome: string;
        url: string;
        arquivo: string;
        coletado_em: string;
        dados_demonstrativos: number;
      }
    | undefined;

  if (!fonte) throw new Error('Nenhuma importacao bem-sucedida encontrada.');

  const competencias = competenciasArmazenadas(db);
  const demonstrativos = fonte.dados_demonstrativos === 1;

  // Salvaguarda de producao (§48): artefato demonstrativo nunca vai ao ar
  // sem que alguem assuma explicitamente a decisao.
  if (demonstrativos && process.env['NETRANK_AMBIENTE'] === 'producao') {
    throw new Error(
      'Build abortado: o warehouse contem dados DEMONSTRATIVOS e o ambiente e producao. ' +
        'Importe dados reais da Anatel antes de publicar.',
    );
  }

  const procedencia: ProcedenciaDados = {
    fonte: fonte.nome,
    url: fonte.url,
    arquivo: fonte.arquivo,
    competenciaInicial: competencias[0]!,
    competenciaFinal: competencias[competencias.length - 1]!,
    coletadoEm: fonte.coletado_em,
    processadoEm: new Date().toISOString(),
    dadosDemonstrativos: demonstrativos,
  };

  const resultado = construirArtefatos(db, { destino: CAMINHOS.artefatos, procedencia });
  console.log(
    `[build] ${resultado.arquivosGerados} artefatos em ${CAMINHOS.artefatos} ` +
      `(competencia ${rotularCompetencia(resultado.competenciaAtual)})`,
  );
  if (demonstrativos) {
    console.warn('[build] ATENCAO: artefatos marcados como DADOS DEMONSTRATIVOS.');
  }
}

function status(db: Banco): void {
  const competencias = competenciasArmazenadas(db);
  console.log(`Competencias armazenadas: ${competencias.length}`);
  if (competencias.length > 0) {
    console.log(`  de ${competencias[0]} ate ${competencias[competencias.length - 1]}`);
  }
  const totais = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM empresas) AS empresas,
              (SELECT COUNT(*) FROM municipios) AS municipios,
              (SELECT COUNT(*) FROM fato_acessos) AS fatos`,
    )
    .get() as { empresas: number; municipios: number; fatos: number };
  console.log(
    `Empresas: ${totais.empresas} | Municipios: ${totais.municipios} | Fatos: ${totais.fatos}`,
  );

  const execucoes = db
    .prepare(
      `SELECT id, status, iniciado_em, linhas_rj, linhas_rejeitadas, mensagem
         FROM execucoes_importacao ORDER BY id DESC LIMIT 5`,
    )
    .all() as Array<Record<string, unknown>>;
  console.log('\nUltimas execucoes:');
  for (const e of execucoes) {
    console.log(
      `  #${e['id']} ${e['status']} ${e['iniciado_em']} ` +
        `(RJ: ${e['linhas_rj']}, rejeitadas: ${e['linhas_rejeitadas']})` +
        (e['mensagem'] ? ` — ${e['mensagem']}` : ''),
    );
  }

  const alertas = db
    .prepare(
      `SELECT severidade, COUNT(*) AS total FROM alertas_qualidade GROUP BY severidade`,
    )
    .all() as Array<{ severidade: string; total: number }>;
  console.log('\nAlertas de qualidade:');
  if (alertas.length === 0) console.log('  nenhum');
  for (const a of alertas) console.log(`  ${a.severidade}: ${a.total}`);
}

async function principal(): Promise<void> {
  const [comando, ...resto] = process.argv.slice(2);
  const db = abrirBanco();

  try {
    switch (comando) {
      case 'demo': {
        const caminho = path.join(CAMINHOS.trabalho, 'anatel-DEMONSTRATIVO-rj.csv');
        escreverCsvDemo(caminho, { meses: 24 });
        console.log(`[demo] fixture sintetica gerada em ${caminho}`);
        console.warn('[demo] ATENCAO: DADOS DEMONSTRATIVOS — NAO OFICIAIS.');
        await importar(db, caminho, {
          url: 'fixture-local://netrank/demo',
          dadosDemonstrativos: true,
        });
        build(db);
        break;
      }
      case 'importar': {
        const caminho = resto[0];
        if (!caminho) throw new Error('Uso: npm run etl -- importar <caminho-do-csv> [--latin1]');
        await importar(db, path.resolve(caminho), {
          url: FONTE_ANATEL.portalDados,
          dadosDemonstrativos: false,
          ...(resto.includes('--latin1') ? { encoding: 'latin1' as const } : {}),
        });
        break;
      }
      case 'build':
        build(db);
        break;
      case 'status':
        status(db);
        break;
      default:
        console.log(
          'Comandos: demo | importar <csv> [--latin1] | build | status',
        );
        process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
