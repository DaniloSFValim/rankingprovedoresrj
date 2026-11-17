import { describe, expect, it } from 'vitest';
import { saltosIsolados } from '../serie';

const serie = (valores: Array<number | null>) =>
  valores.map((valor, i) => ({ competencia: `2024-${String(i + 1).padStart(2, '0')}`, valor }));

describe('saltosIsolados', () => {
  it('marca o mês que sobe e volta (caso de out/2024 no Estado)', () => {
    const s = saltosIsolados(serie([4083589, 4413205, 4144803]));
    expect(s).toHaveLength(1);
    expect(s[0]!.competencia).toBe('2024-02');
    expect(s[0]!.desvioPercentual).toBeCloseTo(7.27, 1);
  });

  it('marca queda isolada', () => {
    expect(saltosIsolados(serie([100, 80, 101]))).toHaveLength(1);
  });

  it('não marca mudança de patamar nem variação pequena', () => {
    expect(saltosIsolados(serie([100, 110, 120]))).toEqual([]);
    expect(saltosIsolados(serie([100, 103, 101]))).toEqual([]);
  });

  it('ignora lacunas e as pontas', () => {
    expect(saltosIsolados(serie([null, 200, 100]))).toEqual([]);
    expect(saltosIsolados(serie([200, 100]))).toEqual([]);
  });
});
