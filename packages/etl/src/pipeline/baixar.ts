/**
 * Etapa COLETA do pipeline (§6).
 *
 * Principios:
 *  - O arquivo baixado e gravado em data/raw/ EXATAMENTE como veio, sem
 *    qualquer transformacao. E a evidencia da procedencia (§5) e o insumo de
 *    qualquer reprocessamento futuro.
 *  - O SHA-256 e calculado durante o download. Se a Anatel republicar o mesmo
 *    arquivo com conteudo diferente, o hash muda e a diferenca fica registrada.
 *  - Download ja realizado nao e refeito: o pipeline e idempotente e barato
 *    de reexecutar.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import { CAMINHOS } from '../config.js';

export interface ArquivoBaixado {
  caminho: string;
  url: string;
  bytes: number;
  sha256: string;
  baixadoEm: string;
  /** true quando o arquivo ja existia localmente e o download foi dispensado. */
  reaproveitado: boolean;
}

function nomeSeguro(url: string): string {
  const base = decodeURIComponent(url.split('/').pop() ?? 'anatel-download');
  return base.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 160) || 'anatel-download';
}

function hashDeArquivo(caminho: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex');
}

/**
 * Baixa um recurso para data/raw/.
 *
 * Grava primeiro em arquivo .parcial e so entao renomeia: um download
 * interrompido nunca deixa arquivo truncado parecendo completo.
 */
export async function baixarRecurso(
  url: string,
  opcoes: { forcar?: boolean; timeoutMs?: number } = {},
): Promise<ArquivoBaixado> {
  fs.mkdirSync(CAMINHOS.brutos, { recursive: true });
  const destino = path.join(CAMINHOS.brutos, nomeSeguro(url));

  if (fs.existsSync(destino) && !opcoes.forcar) {
    const estatisticas = fs.statSync(destino);
    return {
      caminho: destino,
      url,
      bytes: estatisticas.size,
      sha256: hashDeArquivo(destino),
      baixadoEm: estatisticas.mtime.toISOString(),
      reaproveitado: true,
    };
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(
    () => controlador.abort(),
    opcoes.timeoutMs ?? 10 * 60_000,
  );

  const parcial = `${destino}.parcial`;
  try {
    const resposta = await fetch(url, {
      signal: controlador.signal,
      headers: { 'user-agent': 'NETRANK-RJ/0.1 (pipeline de dados abertos)' },
    });
    if (!resposta.ok || !resposta.body) {
      throw new Error(`Download falhou: HTTP ${resposta.status} em ${url}`);
    }

    const esperado = Number(resposta.headers.get('content-length') ?? 0);
    const hash = crypto.createHash('sha256');
    let recebidos = 0;
    let ultimoAviso = 0;

    const entrada = Readable.fromWeb(resposta.body as Parameters<typeof Readable.fromWeb>[0]);
    entrada.on('data', (pedaco: Buffer) => {
      hash.update(pedaco);
      recebidos += pedaco.length;
      if (esperado > 0 && recebidos - ultimoAviso > 20 * 1024 * 1024) {
        ultimoAviso = recebidos;
        const pct = ((recebidos / esperado) * 100).toFixed(0);
        process.stderr.write(`\r[baixar] ${pct}% (${(recebidos / 1e6).toFixed(0)} MB)`);
      }
    });

    await pipeline(entrada, fs.createWriteStream(parcial));
    if (esperado > 0) process.stderr.write('\n');

    // Transferencia truncada e erro, nao arquivo valido menor.
    if (esperado > 0 && recebidos !== esperado) {
      throw new Error(
        `Download incompleto: recebidos ${recebidos} de ${esperado} bytes em ${url}`,
      );
    }

    fs.renameSync(parcial, destino);
    return {
      caminho: destino,
      url,
      bytes: recebidos,
      sha256: hash.digest('hex'),
      baixadoEm: new Date().toISOString(),
      reaproveitado: false,
    };
  } finally {
    clearTimeout(temporizador);
    fs.rmSync(parcial, { force: true });
  }
}

/**
 * Extrai os CSVs de um ZIP para data/work/, em streaming.
 *
 * A Anatel distribui os anos como ZIP contendo um CSV grande. A extracao e
 * feita entrada a entrada, sem carregar o arquivo inteiro em memoria.
 */
export function extrairZip(caminhoZip: string): Promise<string[]> {
  return new Promise((resolve, rejeitar) => {
    fs.mkdirSync(CAMINHOS.trabalho, { recursive: true });
    const extraidos: string[] = [];

    yauzl.open(caminhoZip, { lazyEntries: true }, (erro, zip) => {
      if (erro) return rejeitar(erro);

      zip.on('entry', (entrada) => {
        const ehDados = /\.(csv|txt)$/i.test(entrada.fileName);
        if (entrada.fileName.endsWith('/') || !ehDados) {
          zip.readEntry();
          return;
        }

        const destino = path.join(
          CAMINHOS.trabalho,
          path.basename(entrada.fileName).replace(/[^A-Za-z0-9._-]/g, '_'),
        );

        zip.openReadStream(entrada, (erroLeitura, fluxo) => {
          if (erroLeitura) return rejeitar(erroLeitura);
          pipeline(fluxo, fs.createWriteStream(destino))
            .then(() => {
              extraidos.push(destino);
              zip.readEntry();
            })
            .catch(rejeitar);
        });
      });

      zip.on('end', () => resolve(extraidos));
      zip.on('error', rejeitar);
      zip.readEntry();
    });
  });
}

/**
 * Resolve um arquivo baixado para a lista de CSVs processaveis.
 * ZIP e descompactado; CSV segue direto.
 */
export async function prepararCsvs(arquivo: ArquivoBaixado): Promise<string[]> {
  if (/\.zip$/i.test(arquivo.caminho)) {
    const extraidos = await extrairZip(arquivo.caminho);
    if (extraidos.length === 0) {
      throw new Error(`Nenhum CSV encontrado dentro de ${arquivo.caminho}`);
    }
    return extraidos;
  }
  return [arquivo.caminho];
}
