import { describe, expect, it } from 'vitest';
import { ehRetornoAposQueda, PISO_ACESSOS_MOVIMENTACAO } from '../pipeline/artefatos';

describe('ehRetornoAposQueda', () => {
  it('detecta a declaração parcial da E-Mex (jun/2026)', () => {
    expect(ehRetornoAposQueda(24213, 4886, 24883)).toBe(true);
  });

  it('não marca crescimento contínuo', () => {
    expect(ehRetornoAposQueda(4000, 4886, 24883)).toBe(false);
  });

  it('não marca queda que não voltou', () => {
    expect(ehRetornoAposQueda(24213, 4886, 6000)).toBe(false);
  });

  it('ignora provedor sem histórico ou abaixo do piso', () => {
    expect(ehRetornoAposQueda(undefined, 10, 500)).toBe(false);
    expect(ehRetornoAposQueda(PISO_ACESSOS_MOVIMENTACAO - 1, 10, 900)).toBe(false);
  });
});
