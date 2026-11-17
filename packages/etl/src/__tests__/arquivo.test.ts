import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { gerarCsvDemo } from '../fixtures/gerar-demo.js';
import { arquivarPublicacao, lerIndice } from '../pipeline/arquivo.js';
import { carregar, iniciarExecucao, registrarFonte } from '../pipeline/carregar.js';
import { extrairRjDeTexto } from '../pipeline/extrair.js';
import { abrirBancoMemoria } from '../warehouse/db.js';

async function bancoComDados(meses: number) {
  const db = abrirBancoMemoria();
  const fonteId = registrarFonte(db, {
    nome: 'teste',
    url: 'fixture-local://teste',
    arquivo: 'teste.csv',
    hashSha256: 'x',
    bytes: 0,
    coletadoEm: '2026-11-17T01:00:00.000Z',
    dadosDemonstrativos: false,
  });
  carregar(db, await extrairRjDeTexto(gerarCsvDemo({ meses })), iniciarExecucao(db, fonteId));
  return db;
}

describe('arquivarPublicacao', () => {
  it('grava o retrato, registra no índice e não repete publicação igual', async () => {
    const db = await bancoComDados(3);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arquivo-'));

    const r1 = arquivarPublicacao(db, dir);
    expect(r1.tipo).toBe('gravado');
    if (r1.tipo !== 'gravado') return;
    expect(r1.entrada.arquivo).toBe('publicacao-2026-11-17.csv.gz');

    const csv = gunzipSync(fs.readFileSync(path.join(dir, r1.entrada.arquivo))).toString('utf8');
    const linhas = csv.trim().split('\n');
    expect(linhas[0]).toBe('competencia,codigo_ibge,empresa_id,cnpj,tecnologia,acessos');
    expect(linhas).toHaveLength(r1.entrada.linhas + 1);
    const total = linhas.slice(1).reduce((s, l) => s + Number(l.split(',').at(-1)), 0);
    expect(total).toBe(r1.entrada.totalAcessos);

    expect(arquivarPublicacao(db, dir).tipo).toBe('inalterado');
    expect(lerIndice(dir).publicacoes).toHaveLength(1);
  });

  it('grava nova entrada quando a publicação muda, sem sobrescrever a anterior', async () => {
    const db = await bancoComDados(3);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arquivo-'));
    arquivarPublicacao(db, dir);

    db.prepare('UPDATE fato_acessos SET acessos = acessos + 1 WHERE rowid = 1').run();
    const r2 = arquivarPublicacao(db, dir);
    expect(r2.tipo).toBe('gravado');
    if (r2.tipo !== 'gravado') return;
    expect(r2.entrada.arquivo).toBe('publicacao-2026-11-17-2.csv.gz');
    expect(lerIndice(dir).publicacoes.map((p) => p.arquivo)).toEqual([
      'publicacao-2026-11-17.csv.gz',
      'publicacao-2026-11-17-2.csv.gz',
    ]);
  });

  it('gera os mesmos bytes para o mesmo conteúdo', async () => {
    const db = await bancoComDados(2);
    const [a, b] = [fs.mkdtempSync(path.join(os.tmpdir(), 'arq-a-')), fs.mkdtempSync(path.join(os.tmpdir(), 'arq-b-'))];
    arquivarPublicacao(db, a);
    arquivarPublicacao(db, b);
    const nome = lerIndice(a).publicacoes[0]!.arquivo;
    expect(fs.readFileSync(path.join(a, nome)).equals(fs.readFileSync(path.join(b, nome)))).toBe(true);
  });
});
