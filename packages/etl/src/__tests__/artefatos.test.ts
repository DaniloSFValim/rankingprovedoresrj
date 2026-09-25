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

  it('calcula densidade por domicilio e percentual de conexoes lentas', async () => {
    const db = abrirBancoMemoria();
    const fonteId = registrarFonte(db, {
      nome: 'teste', url: 'x', arquivo: 'a.csv', hashSha256: 'x', bytes: 0,
      coletadoEm: new Date().toISOString(), dadosDemonstrativos: false,
    });
    const cab =
      'Ano;Mês;Grupo Econômico;Empresa;CNPJ;Porte da Prestadora;UF;Município;Código IBGE Município;' +
      'Faixa de Velocidade;Velocidade;Tecnologia;Meio de Acesso;Tipo de Pessoa;Tipo de Produto;Acessos';
    const csv = [
      cab,
      '2026;7;OUTROS;PROV A;11111111000111;Pequeno Porte;RJ;Niterói;3303302;> 34Mbps;500,000000;FTTH;Fibra;Pessoa Física;INTERNET;60',
      '2026;7;OUTROS;PROV A;11111111000111;Pequeno Porte;RJ;Niterói;3303302;> 34Mbps;500,000000;FTTH;Fibra;Pessoa Jurídica;INTERNET;20',
      '2026;7;OUTROS;PROV B;22222222000122;Pequeno Porte;RJ;Niterói;3303302;2Mbps a 12Mbps;10,000000;xDSL;Cabo Metálico;Pessoa Física;INTERNET;20',
    ].join('\n');
    carregar(db, await extrairRjDeTexto(csv), iniciarExecucao(db, fonteId));

    const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'artefatos-'));
    construirArtefatos(db, {
      destino,
      domicilios: { '3303302': 200 },
      procedencia: {
        fonte: 'teste', url: 'x', arquivo: 'a.csv', competenciaInicial: '2026-07',
        competenciaFinal: '2026-07', coletadoEm: '', processadoEm: '', dadosDemonstrativos: false,
      },
    });
    const ler = (r: string) => JSON.parse(fs.readFileSync(path.join(destino, r), 'utf8'));
    const indice = ler('municipios/index.json').municipios[0];
    // 80 acessos de pessoa fisica / 200 domicilios
    expect(indice.densidade).toBeCloseTo(40);
    // 20 de 100 acessos abaixo de 50 Mbps
    expect(indice.percentualAbaixo50).toBeCloseTo(20);
    expect(ler('estado/kpis.json').densidadeEstado).toBeCloseTo(40);
    const perfilMunicipio = ler(`municipios/${indice.slug}.json`);
    expect(perfilMunicipio.domicilios).toBe(200);
    expect(perfilMunicipio.perfilAcessos.acessosComVelocidade).toBe(100);
    // Sem malha no destino não há vizinhos; sem saídas, a lista vem vazia mas presente.
    expect(perfilMunicipio.alertas).toEqual([]);
    expect(indice.alertas).toEqual([]);
    fs.rmSync(destino, { recursive: true, force: true });
  });
});
