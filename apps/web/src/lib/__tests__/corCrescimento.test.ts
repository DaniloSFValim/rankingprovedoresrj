import { describe, expect, it } from 'vitest';
import { corCrescimento, corTextoCrescimento, intensidade } from '../corCrescimento';

describe('cor do crescimento', () => {
  it('zero é o cinza neutro', () => {
    expect(corCrescimento(0)).toBe('#e1e6e8');
  });
  it('no teto ou além: verde ou vermelho cheio', () => {
    expect(corCrescimento(30)).toBe('#1e7b4c');
    expect(corCrescimento(409)).toBe('#1e7b4c');
    expect(corCrescimento(-30)).toBe('#b3372c');
    expect(corCrescimento(-53)).toBe('#b3372c');
  });
  it('queda puxa para o vermelho, alta para o verde', () => {
    const queda = corCrescimento(-10);
    const alta = corCrescimento(10);
    expect(parseInt(queda.slice(1, 3), 16)).toBeGreaterThan(parseInt(queda.slice(3, 5), 16));
    expect(parseInt(alta.slice(3, 5), 16)).toBeGreaterThan(parseInt(alta.slice(1, 3), 16));
  });
  it('intensidade satura e ignora valores inválidos', () => {
    expect(intensidade(15)).toBeCloseTo(0.5);
    expect(intensidade(-90)).toBe(1);
    expect(intensidade(Number.NaN)).toBe(0);
  });
  it('rótulo branco só sobre cor forte', () => {
    expect(corTextoCrescimento(2)).toBe('#141d26');
    expect(corTextoCrescimento(-25)).toBe('#ffffff');
  });
});
