import { describe, expect, it } from 'vitest';
import { alertasDeDensidade, alertasDeSaida, vizinhancaDaMalha } from '../pipeline/alertas.js';

describe('alertasDeSaida', () => {
  it('alerta quando prestadora com 20% ou mais da base some', () => {
    const r = alertasDeSaida(
      [
        { empresaId: 'a', nome: 'Fiber Vox', acessosAnteriores: 10812 },
        { empresaId: 'b', nome: 'Pequena', acessosAnteriores: 441 },
      ],
      24358,
      new Map(),
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ tipo: 'saida-abrupta', nome: 'Fiber Vox', municipiosAtuais: 0 });
    expect((r[0] as { percentualDaBase: number }).percentualDaBase).toBeCloseTo(44.4, 1);
  });

  it('ignora saidas pequenas em valor absoluto', () => {
    expect(alertasDeSaida([{ empresaId: 'a', nome: 'X', acessosAnteriores: 50 }], 100, new Map())).toEqual([]);
  });
});

// Três quadrados lado a lado: A | B | C. A e C não se tocam.
const quadrado = (x: number) => [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]];
const malha = {
  features: ['A', 'B', 'C'].map((n, i) => ({
    properties: { name: n },
    geometry: { coordinates: [quadrado(i)] },
  })),
};

describe('vizinhancaDaMalha', () => {
  it('liga municipios que compartilham fronteira', () => {
    const v = vizinhancaDaMalha(malha);
    expect([...v.get('B')!].sort()).toEqual(['A', 'C']);
    expect(v.get('A')!.has('C')).toBe(false);
  });
});

describe('alertasDeDensidade', () => {
  const vizinhos = vizinhancaDaMalha(malha);
  const densidades = new Map([
    ['A', { nome: 'Paracambi', densidade: 106.7 }],
    ['B', { nome: 'Frontin', densidade: 3.7 }],
    ['C', { nome: 'Vassouras', densidade: 87 }],
  ]);

  it('marca densidade acima de 100 e aponta vizinhos muito baixos', () => {
    expect(alertasDeDensidade('A', densidades, vizinhos)).toEqual([
      {
        tipo: 'densidade-acima-100',
        densidade: 106.7,
        vizinhosBaixos: [{ codigoIbge: 'B', nome: 'Frontin', densidade: 3.7 }],
      },
    ]);
  });

  it('marca densidade muito baixa só quando ha vizinho acima de 100', () => {
    expect(alertasDeDensidade('B', densidades, vizinhos)[0]).toMatchObject({ tipo: 'densidade-muito-baixa' });
    expect(alertasDeDensidade('C', densidades, vizinhos)).toEqual([]);
    const semVizinhoAlto = new Map(densidades).set('A', { nome: 'Paracambi', densidade: 60 });
    expect(alertasDeDensidade('B', semVizinhoAlto, vizinhos)).toEqual([]);
  });
});
