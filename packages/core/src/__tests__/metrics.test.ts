import { describe, expect, it } from 'vitest';
import {
  calcularConcentracao,
  cagrMensal,
  compararRankings,
  construirRanking,
  crescimentoAbsoluto,
  crescimentoPercentual,
  hhi,
  marketShare,
  razaoConcentracao,
} from '../metrics.js';
import type { ParticipanteMercado } from '../types.js';

const mercado = (pares: Array<[string, number]>): ParticipanteMercado[] =>
  pares.map(([empresaId, acessos]) => ({ empresaId, acessos }));

describe('marketShare', () => {
  it('calcula participacao em pontos percentuais', () => {
    expect(marketShare(25, 100)).toBe(25);
  });

  it('retorna null quando o total e zero (0/0 e indefinido, nao 0%)', () => {
    expect(marketShare(0, 0)).toBeNull();
  });
});

describe('construirRanking', () => {
  it('ordena por acessos decrescentes e soma 100% de share', () => {
    const r = construirRanking(mercado([['a', 100], ['b', 300], ['c', 600]]));
    expect(r.map((l) => l.empresaId)).toEqual(['c', 'b', 'a']);
    expect(r.map((l) => l.posicao)).toEqual([1, 2, 3]);
    expect(r.reduce((s, l) => s + l.marketShare, 0)).toBeCloseTo(100, 10);
  });

  it('exclui provedores com zero acessos do mercado', () => {
    const r = construirRanking(mercado([['a', 10], ['b', 0]]));
    expect(r).toHaveLength(1);
    expect(r[0]!.marketShare).toBe(100);
  });

  it('aplica standard competition ranking em empates (1, 2, 2, 4)', () => {
    const r = construirRanking(
      mercado([['a', 50], ['b', 30], ['c', 30], ['d', 10]]),
    );
    expect(r.map((l) => l.posicao)).toEqual([1, 2, 2, 4]);
  });

  it('desempata de forma deterministica por empresaId', () => {
    const entrada = mercado([['zeta', 30], ['alfa', 30]]);
    const primeira = construirRanking(entrada).map((l) => l.empresaId);
    const segunda = construirRanking([...entrada].reverse()).map((l) => l.empresaId);
    expect(primeira).toEqual(['alfa', 'zeta']);
    expect(primeira).toEqual(segunda);
  });
});

describe('compararRankings', () => {
  const atual = construirRanking(mercado([['a', 150], ['b', 100], ['novo', 50]]));
  const anterior = construirRanking(mercado([['b', 120], ['a', 100]]));
  const comparado = compararRankings(atual, anterior);
  const por = (id: string) => comparado.find((l) => l.empresaId === id)!;

  it('sinaliza ganho de posicao com valor positivo', () => {
    expect(por('a').variacaoPosicao).toBe(1); // 2o -> 1o
    expect(por('b').variacaoPosicao).toBe(-1); // 1o -> 2o
  });

  it('calcula variacao absoluta e percentual separadamente', () => {
    expect(por('a').variacaoAbsoluta).toBe(50);
    expect(por('a').variacaoPercentual).toBeCloseTo(50, 10);
    expect(por('b').variacaoAbsoluta).toBe(-20);
  });

  it('nao atribui crescimento a entrante sem base anterior', () => {
    expect(por('novo').posicaoAnterior).toBeNull();
    expect(por('novo').variacaoPercentual).toBeNull();
    expect(por('novo').variacaoAbsoluta).toBeNull();
  });
});

describe('razaoConcentracao', () => {
  const m = mercado([['a', 50], ['b', 25], ['c', 15], ['d', 6], ['e', 4]]);

  it('CR1 corresponde ao share do lider', () => {
    expect(razaoConcentracao(m, 1)).toBeCloseTo(50, 10);
  });

  it('CR3 soma os tres maiores', () => {
    expect(razaoConcentracao(m, 3)).toBeCloseTo(90, 10);
  });

  it('satura em 100 quando n excede o numero de provedores', () => {
    expect(razaoConcentracao(m, 10)).toBeCloseTo(100, 10);
  });

  it('retorna null em mercado sem acessos', () => {
    expect(razaoConcentracao(mercado([['a', 0]]), 3)).toBeNull();
  });
});

describe('hhi', () => {
  it('monopolio puro resulta em 10000', () => {
    expect(hhi(mercado([['a', 999]]))).toBeCloseTo(10000, 8);
  });

  it('duopolio simetrico resulta em 5000', () => {
    expect(hhi(mercado([['a', 50], ['b', 50]]))).toBeCloseTo(5000, 8);
  });

  it('N players identicos resultam em 10000/N', () => {
    const dez = mercado(Array.from({ length: 10 }, (_, i) => [`e${i}`, 10] as [string, number]));
    expect(hhi(dez)).toBeCloseTo(1000, 8);
  });

  it('e calculado sobre todos os participantes, nao apenas o topo', () => {
    const concentrado = hhi(mercado([['a', 90], ['b', 10]]))!;
    const pulverizado = hhi(
      mercado([['a', 90], ...Array.from({ length: 10 }, (_, i) => [`x${i}`, 1] as [string, number])]),
    )!;
    expect(concentrado).toBeGreaterThan(pulverizado);
  });

  it('ignora provedores zerados sem alterar o resultado', () => {
    expect(hhi(mercado([['a', 50], ['b', 50], ['z', 0]]))).toBeCloseTo(5000, 8);
  });
});

describe('calcularConcentracao', () => {
  it('produz painel coerente com as funcoes individuais', () => {
    const m = mercado([['a', 40], ['b', 30], ['c', 20], ['d', 10]]);
    const painel = calcularConcentracao(m)!;
    expect(painel.cr1).toBeCloseTo(40, 10);
    expect(painel.cr3).toBeCloseTo(90, 10);
    expect(painel.cr5).toBeCloseTo(100, 10);
    expect(painel.hhi).toBeCloseTo(hhi(m)!, 10);
    expect(painel.numeroProvedores).toBe(4);
    expect(painel.totalAcessos).toBe(100);
  });

  it('CR1 <= CR3 <= CR5 <= CR10 sempre', () => {
    const m = mercado(
      Array.from({ length: 20 }, (_, i) => [`e${i}`, 100 - i * 3] as [string, number]),
    );
    const p = calcularConcentracao(m)!;
    expect(p.cr1).toBeLessThanOrEqual(p.cr3);
    expect(p.cr3).toBeLessThanOrEqual(p.cr5);
    expect(p.cr5).toBeLessThanOrEqual(p.cr10);
    expect(p.cr10).toBeLessThanOrEqual(100 + 1e-9);
  });

  it('retorna null em mercado vazio em vez de zeros enganosos', () => {
    expect(calcularConcentracao([])).toBeNull();
  });
});

describe('crescimento', () => {
  it('distingue absoluto de percentual', () => {
    expect(crescimentoAbsoluto(1200, 1000)).toBe(200);
    expect(crescimentoPercentual(1200, 1000)).toBeCloseTo(20, 10);
  });

  it('nao produz percentual a partir de base zero', () => {
    expect(crescimentoPercentual(500, 0)).toBeNull();
    expect(crescimentoAbsoluto(500, 0)).toBe(500);
  });

  it('CAGR mensal reconstroi o valor final', () => {
    const taxa = cagrMensal(2000, 1000, 12)!;
    expect(1000 * Math.pow(1 + taxa / 100, 12)).toBeCloseTo(2000, 6);
  });
});
