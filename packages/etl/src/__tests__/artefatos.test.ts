import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { gerarCsvDemo } from '../fixtures/gerar-demo.js';
import { construirArtefatos } from '../pipeline/artefatos.js';
import { carregar, iniciarExecucao, registrarFonte } from '../pipeline/carregar.js';
import { extrairRjDeTexto } from '../pipeline/extrair.js';
import { abrirBancoMemoria } from '../warehouse/db.js';

describe('construirArtefatos', () => {
  it('remove arquivos de provedores e municipios que nao existem mais', async () => {
    const db = abrirBancoMemoria();
    const fonteId = registrarFonte(db, {
      nome: 'teste',
      url: 'fixture-local://teste',
      arquivo: 'teste.csv',
      hashSha256: 'x',
      bytes: 0,
      coletadoEm: new Date().toISOString(),
      dadosDemonstrativos: true,
    });
    const extracao = await extrairRjDeTexto(gerarCsvDemo({ meses: 3 }));
    carregar(db, extracao, iniciarExecucao(db, fonteId));

    const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'artefatos-'));
    const orfaos = ['provedores/slug-antigo.json', 'municipios/slug-antigo.json'];
    for (const relativo of orfaos) {
      fs.mkdirSync(path.dirname(path.join(destino, relativo)), { recursive: true });
      fs.writeFileSync(path.join(destino, relativo), '{}');
    }

    construirArtefatos(db, {
      destino,
      procedencia: {
        fonte: 'teste',
        url: 'fixture-local://teste',
        arquivo: 'teste.csv',
        competenciaInicial: '2026-01',
        competenciaFinal: '2026-03',
        coletadoEm: new Date().toISOString(),
        processadoEm: new Date().toISOString(),
        dadosDemonstrativos: true,
      },
    });

    for (const relativo of orfaos) {
      expect(fs.existsSync(path.join(destino, relativo))).toBe(false);
    }
    expect(fs.existsSync(path.join(destino, 'provedores/index.json'))).toBe(true);
    expect(fs.existsSync(path.join(destino, 'municipios/index.json'))).toBe(true);
    fs.rmSync(destino, { recursive: true, force: true });
  });
});
