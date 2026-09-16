import { describe, expect, it } from 'vitest';
import {
  escolherTabela,
  mapearColunas,
  montarConsultaRj,
  SchemaIncompativelError,
} from '../sources/basedosdados.js';
import { converterParaExtracao } from '../pipeline/importar-bdd.js';
import type { LinhaBdd } from '../sources/basedosdados.js';

const COLUNAS_BDD = [
  'ano', 'mes', 'sigla_uf', 'id_municipio', 'empresa', 'cnpj',
  'grupo_economico', 'tecnologia', 'acessos',
];

describe('mapearColunas', () => {
  it('mapeia a convencao de nomes da Base dos Dados', () => {
    const mapa = mapearColunas('microdados', COLUNAS_BDD);
    expect(mapa.uf).toBe('sigla_uf');
    expect(mapa.municipio).toBe('id_municipio');
    expect(mapa.acessos).toBe('acessos');
  });

  it('aceita nomes alternativos', () => {
    const mapa = mapearColunas('t', ['ANO', 'MES', 'UF', 'PRESTADORA', 'QUANTIDADE']);
    expect(mapa.empresa).toBe('PRESTADORA');
    expect(mapa.acessos).toBe('QUANTIDADE');
  });

  it('falha explicitamente quando falta campo obrigatorio', () => {
    expect(() => mapearColunas('t', ['ano', 'mes', 'sigla_uf']))
      .toThrow(SchemaIncompativelError);
  });
});

describe('escolherTabela', () => {
  it('prefere a tabela de microdados', () => {
    const m = new Map([['dicionario', ['chave']], ['microdados', COLUNAS_BDD]]);
    expect(escolherTabela(m)).toBe('microdados');
  });

  it('sem microdados, escolhe a tabela que mapeia todos os campos', () => {
    const m = new Map([['dicionario', ['chave', 'valor']], ['acessos_rj', COLUNAS_BDD]]);
    expect(escolherTabela(m)).toBe('acessos_rj');
  });
});

describe('montarConsultaRj', () => {
  const sql = montarConsultaRj('microdados', mapearColunas('microdados', COLUNAS_BDD), 2025);

  it('filtra UF = RJ no servidor, nao no cliente', () => {
    expect(sql).toMatch(/UPPER\(CAST\(`sigla_uf` AS STRING\)\) = 'RJ'/);
  });

  it('agrega no servidor para nao trafegar linhas nacionais', () => {
    expect(sql).toMatch(/SUM\(`acessos`\)/);
    expect(sql).toMatch(/GROUP BY/);
  });

  it('respeita o ano minimo pedido', () => {
    expect(sql).toMatch(/`ano` >= 2025/);
  });
});

describe('converterParaExtracao', () => {
  const linha = (over: Partial<LinhaBdd> = {}): LinhaBdd => ({
    ano: 2026, mes: 8, codigoIbge: '3303302', empresa: 'Alfa Telecom LTDA',
    cnpj: '12345678000195', grupo: 'Grupo Alfa', tecnologia: 'Fibra',
    acessos: 1000, ...over,
  });

  it('produz o mesmo formato da leitura de CSV', () => {
    const r = converterParaExtracao([linha()]);
    expect(r.registros).toHaveLength(1);
    expect(r.registros[0]).toMatchObject({
      competencia: '2026-08', codigoIbge: '3303302', tecnologia: 'FIBRA', acessos: 1000,
    });
  });

  it('agrega linhas da mesma chave', () => {
    const r = converterParaExtracao([linha({ acessos: 600 }), linha({ acessos: 400 })]);
    expect(r.registros).toHaveLength(1);
    expect(r.registros[0]!.acessos).toBe(1000);
  });

  it('rejeita municipio fora do RJ em vez de aceitar', () => {
    const r = converterParaExtracao([linha({ codigoIbge: '3550308' })]);
    expect(r.registros).toHaveLength(0);
    expect(r.estatisticas.motivosRejeicao['codigo_ibge_invalido']).toBe(1);
  });

  it('rejeita competencia invalida', () => {
    const r = converterParaExtracao([linha({ mes: 13 })]);
    expect(r.estatisticas.motivosRejeicao['competencia_invalida']).toBe(1);
  });

  it('unifica grafias pela raiz do CNPJ, como no caminho de CSV', () => {
    const r = converterParaExtracao([
      linha({ empresa: 'ALFA TELECOM LTDA', cnpj: '12345678000195', acessos: 600 }),
      linha({ empresa: 'Alfa Telecom', cnpj: '12345678000276', acessos: 400 }),
    ]);
    expect(r.empresas.size).toBe(1);
    expect(r.registros[0]!.acessos).toBe(1000);
  });

  it('nao inventa nome de municipio ausente na fonte', () => {
    const r = converterParaExtracao([linha()]);
    expect(r.municipios.get('3303302')!.nome).toBe('3303302');
  });
});
