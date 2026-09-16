import { describe, expect, it } from 'vitest';
import { interpretarLocalidades } from '../pipeline/nomes-municipios.js';

describe('interpretarLocalidades', () => {
  it('extrai codigo, nome e regiao da hierarquia classica do IBGE', () => {
    const r = interpretarLocalidades(
      JSON.stringify([
        {
          id: 3303302,
          nome: 'Niterói',
          microrregiao: { mesorregiao: { nome: 'Metropolitana do Rio de Janeiro' } },
        },
      ]),
    );
    expect(r).toEqual([
      { codigoIbge: '3303302', nome: 'Niterói', regiao: 'Metropolitana do Rio de Janeiro' },
    ]);
  });

  it('aceita a hierarquia nova de regioes imediatas', () => {
    const r = interpretarLocalidades(
      JSON.stringify([
        {
          id: 3304557,
          nome: 'Rio de Janeiro',
          'regiao-imediata': { 'regiao-intermediaria': { nome: 'Rio de Janeiro' } },
        },
      ]),
    );
    expect(r[0]!.regiao).toBe('Rio de Janeiro');
  });

  it('aceita municipio sem regiao — nome e obrigatorio, regiao nao', () => {
    const r = interpretarLocalidades(JSON.stringify([{ id: 3300100, nome: 'Angra dos Reis' }]));
    expect(r[0]).toEqual({ codigoIbge: '3300100', nome: 'Angra dos Reis', regiao: null });
  });

  it('descarta municipio de outra UF', () => {
    expect(() =>
      interpretarLocalidades(JSON.stringify([{ id: 3550308, nome: 'São Paulo' }])),
    ).toThrow(/Nenhum municipio do RJ/);
  });

  it('rejeita resposta que nao e lista', () => {
    expect(() => interpretarLocalidades('{"erro":"x"}')).toThrow(/nao e uma lista/);
  });
});
