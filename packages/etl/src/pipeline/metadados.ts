/**
 * Gerenciamento de metadados de rastreabilidade para artefatos (§41, §43).
 *
 * Adiciona versão, commit, timestamp, fonte ANATEL e procedência a cada
 * artefato, formando a cadeia de rastreabilidade completa (ANATEL ->
 * RAW -> PROCESSED -> DERIVED -> BI).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import type { ProcedenciaDados } from '@netrank/core';

export interface MetadadosArtefato {
  /** Versão semver do artefato (schema). */
  versao: string;

  /** Competência Anatel (YYYY-MM). */
  competencia: string;

  /** Timestamp ISO8601 de geração. */
  geradoEm: string;

  /** Commit git SHA-1 que gerou este artefato. */
  commitHash: string;

  /** Branch git ativo na geração. */
  branch: string;

  /** Procedência dos dados (ANATEL, BASE_DOS_DADOS, DEMO). */
  procedencia: ProcedenciaDados;

  /** Hash SHA-256 do arquivo para detecção de mudanças. */
  sha256?: string;

  /** Descrição breve do conteúdo. */
  descricao?: string;
}

/**
 * Obtém o commit SHA-1 atual do git (curto: 7 caracteres).
 * Se falhar (não é um repo git), retorna "unknown".
 */
export function obterCommitHash(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Obtém o branch git atual.
 * Se falhar, retorna "unknown".
 */
export function obterBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Calcula SHA-256 de um buffer.
 */
export function calcularSha256(dados: Buffer): string {
  return crypto.createHash('sha256').update(dados).digest('hex');
}

/**
 * Calcula SHA-256 de um arquivo.
 */
export function calcularSha256Arquivo(caminhoArquivo: string): string {
  const conteudo = fs.readFileSync(caminhoArquivo);
  return calcularSha256(conteudo);
}

/**
 * Cria objeto de metadados padrão para um artefato.
 */
export function criarMetadadosArtefato(
  competencia: string,
  procedencia: ProcedenciaDados,
  descricao?: string,
): MetadadosArtefato {
  return {
    versao: '1.0.0',
    competencia,
    geradoEm: new Date().toISOString(),
    commitHash: obterCommitHash(),
    branch: obterBranch(),
    procedencia,
    descricao,
  };
}

/**
 * Enriquece um objeto JSON com metadados de rastreabilidade.
 *
 * Adiciona um campo '_metadata' ao objeto com informações de versão,
 * commit, procedência etc. Preserva o conteúdo original.
 *
 * Exemplo:
 *   { competencia: "2026-07", kpis: {...} }
 *   ->
 *   {
 *     competencia: "2026-07",
 *     kpis: {...},
 *     _metadata: { versao: "1.0.0", commitHash: "abc1234", ... }
 *   }
 */
export function enriquecerComMetadados<T extends Record<string, unknown>>(
  objeto: T,
  competencia: string,
  procedencia: ProcedenciaDados,
  descricao?: string,
): T & { _metadata: MetadadosArtefato } {
  return {
    ...objeto,
    _metadata: criarMetadadosArtefato(competencia, procedencia, descricao),
  };
}

/**
 * Escreve um JSON com metadados e calcula SHA-256.
 *
 * Retorna o SHA-256 do arquivo escrito para auditoria.
 */
export function escreverComMetadados(
  caminhoDestino: string,
  conteudo: unknown,
  competencia: string,
  procedencia: ProcedenciaDados,
  descricao?: string,
): string {
  const json = JSON.stringify(conteudo, null, 2);
  const diretorio = path.dirname(caminhoDestino);

  // Criar diretório se não existe
  if (!fs.existsSync(diretorio)) {
    fs.mkdirSync(diretorio, { recursive: true });
  }

  // Escrever arquivo
  fs.writeFileSync(caminhoDestino, json, 'utf8');

  // Calcular SHA-256
  const sha256 = calcularSha256Arquivo(caminhoDestino);

  // Log de auditoria
  console.log(`✓ Artefato: ${path.relative('.', caminhoDestino)}`);
  console.log(`  Competência: ${competencia}, Procedência: ${procedencia}`);
  console.log(`  SHA-256: ${sha256}`);

  return sha256;
}

/**
 * Valida integridade de um artefato comparando SHA-256.
 *
 * Retorna { ok: true } se SHA-256 bate, ou
 * { ok: false, esperado: "...", obtido: "..." } se não bate.
 */
export function validarIntegridade(
  caminhoArquivo: string,
  sha256Esperado: string,
): { ok: boolean; esperado?: string; obtido?: string } {
  try {
    const obtido = calcularSha256Arquivo(caminhoArquivo);
    if (obtido === sha256Esperado) {
      return { ok: true };
    }
    return { ok: false, esperado: sha256Esperado, obtido };
  } catch (erro) {
    return { ok: false, obtido: String(erro) };
  }
}

/**
 * Gera relatório de rastreabilidade para um artefato.
 *
 * Útil para inspeção e auditoria de proveniência.
 */
export function gerarRelatorioRastreabilidade(
  caminhoArquivo: string,
): {
  arquivo: string;
  existe: boolean;
  tamanhoBytes?: number;
  sha256?: string;
  metadadados?: MetadadosArtefato;
} {
  if (!fs.existsSync(caminhoArquivo)) {
    return { arquivo: caminhoArquivo, existe: false };
  }

  const stats = fs.statSync(caminhoArquivo);
  const sha256 = calcularSha256Arquivo(caminhoArquivo);

  let metadadados: MetadadosArtefato | undefined;
  try {
    const conteudo = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));
    if (conteudo._metadata) {
      metadadados = conteudo._metadata as MetadadosArtefato;
    }
  } catch {
    // Não é JSON ou não tem metadados
  }

  return {
    arquivo: caminhoArquivo,
    existe: true,
    tamanhoBytes: stats.size,
    sha256,
    metadadados,
  };
}
