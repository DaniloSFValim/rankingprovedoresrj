import { describe, expect, it } from 'vitest';
import {
  cnpjsParaConsultar,
  consultarCnpj,
  converterRespostaBrasilApi,
  normalizarCnpj,
  type CacheReceita,
} from '../sources/receita.js';

const RESPOSTA = {
  cnpj: '02558157000162',
  razao_social: 'TELEFONICA BRASIL S.A.',
  nome_fantasia: 'VIVO',
  descricao_situacao_cadastral: 'ATIVA',
  data_situacao_cadastral: '2005-11-03',
  data_inicio_atividade: '1998-05-11',
  porte: 'DEMAIS',
  natureza_juridica: 'Sociedade Anônima Aberta',
  cnae_fiscal: 6110801,
  cnae_fiscal_descricao: 'Serviços de telefonia fixa comutada - STFC',
  municipio: 'SAO PAULO',
  uf: 'SP',
  capital_social: 63571415865.09,
  qsa: [{ nome_socio: 'PESSOA FISICA' }],
};

const AGORA = '2026-09-23T00:00:00.000Z';

describe('normalizarCnpj', () => {
  it('remove pontuacao e completa zeros a esquerda', () => {
    expect(normalizarCnpj('02.558.157/0001-62')).toBe('02558157000162');
    expect(normalizarCnpj('2558157000162')).toBe('02558157000162');
  });
  it('rejeita vazio, so zeros e mais de 14 digitos', () => {
    expect(normalizarCnpj('')).toBeNull();
    expect(normalizarCnpj(null)).toBeNull();
    expect(normalizarCnpj('00000000000000')).toBeNull();
    expect(normalizarCnpj('123456789012345')).toBeNull();
  });
});

describe('converterRespostaBrasilApi', () => {
  it('mapeia os campos e descarta o quadro societario', () => {
    const c = converterRespostaBrasilApi('02558157000162', RESPOSTA, AGORA);
    expect(c).toEqual({
      cnpj: '02558157000162',
      razaoSocial: 'TELEFONICA BRASIL S.A.',
      nomeFantasia: 'VIVO',
      situacao: 'ATIVA',
      dataSituacao: '2005-11-03',
      dataAbertura: '1998-05-11',
      porte: 'DEMAIS',
      naturezaJuridica: 'Sociedade Anônima Aberta',
      cnaePrincipal: { codigo: '6110801', descricao: 'Serviços de telefonia fixa comutada - STFC' },
      municipio: 'SAO PAULO',
      uf: 'SP',
      capitalSocial: 63571415865.09,
      consultadoEm: AGORA,
    });
    expect(JSON.stringify(c)).not.toContain('PESSOA FISICA');
  });
  it('campo ausente ou vazio vira null', () => {
    const c = converterRespostaBrasilApi('1', { nome_fantasia: '  ' }, AGORA);
    expect(c.nomeFantasia).toBeNull();
    expect(c.situacao).toBeNull();
    expect(c.cnaePrincipal).toBeNull();
    expect(c.capitalSocial).toBeNull();
  });
});

describe('consultarCnpj', () => {
  const resposta = (status: number, corpo: unknown = {}) => ({ status, json: async () => corpo });

  it('retorna o cadastro em 200', async () => {
    const r = await consultarCnpj('02558157000162', {
      buscar: async () => resposta(200, RESPOSTA),
      agora: () => new Date(AGORA),
    });
    expect(r.tipo).toBe('ok');
  });
  it('404 e cnpj inexistente, sem novas tentativas', async () => {
    let chamadas = 0;
    const r = await consultarCnpj('1', {
      buscar: async () => (chamadas++, resposta(404)),
      fontes: [{ nome: 'A', url: (c) => c }],
    });
    expect(r).toEqual({ tipo: 'inexistente' });
    expect(chamadas).toBe(1);
  });
  it('tenta de novo em 429 e 5xx', async () => {
    const status = [429, 503, 200];
    const r = await consultarCnpj('1', {
      buscar: async () => resposta(status.shift()!, RESPOSTA),
      pausaBaseMs: 0,
    });
    expect(r.tipo).toBe('ok');
  });
  it('desiste depois das tentativas e informa o motivo', async () => {
    const r = await consultarCnpj('1', {
      buscar: async () => resposta(503),
      tentativas: 2,
      pausaBaseMs: 0,
      fontes: [{ nome: 'A', url: (c) => `a/${c}` }],
    });
    expect(r).toEqual({ tipo: 'falha', motivo: 'A: HTTP 503' });
  });
  it('recorre a proxima fonte quando a primeira bloqueia', async () => {
    const urls: string[] = [];
    const r = await consultarCnpj('1', {
      buscar: async (url) => (urls.push(url), url.startsWith('a/') ? resposta(403) : resposta(200, RESPOSTA)),
      pausaBaseMs: 0,
      fontes: [
        { nome: 'A', url: (c) => `a/${c}` },
        { nome: 'B', url: (c) => `b/${c}` },
      ],
    });
    expect(r.tipo).toBe('ok');
    expect(urls).toEqual(['a/1', 'b/1']);
  });
});

describe('cnpjsParaConsultar', () => {
  it('consulta novos e vencidos, pula os recentes', () => {
    const cache: CacheReceita = {
      fonte: 'x',
      empresas: {
        '11111111000111': { consultadoEm: '2026-09-20T00:00:00Z' } as never,
        '22222222000122': { consultadoEm: '2026-07-01T00:00:00Z' } as never,
      },
    };
    const pendentes = cnpjsParaConsultar(
      ['11111111000111', '22222222000122', '33333333000133', '33333333000133'],
      cache,
      new Date(AGORA),
    );
    expect(pendentes).toEqual(['22222222000122', '33333333000133']);
  });
});
