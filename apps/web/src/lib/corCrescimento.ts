/**
 * Cor de um bloco pelo crescimento, numa escala divergente centrada no zero:
 * queda em `baixa`, estável em cinza claro, alta em `alta`. A intensidade
 * satura no teto (em pontos percentuais) para que um único provedor com
 * +400% não apague a diferença entre todos os outros.
 */
const NEUTRO = [0xe1, 0xe6, 0xe8]; // grafite-800
const ALTA = [0x1e, 0x7b, 0x4c];
const BAIXA = [0xb3, 0x37, 0x2c];

export const TETO_CRESCIMENTO = 30;

const hex = (rgb: number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/** Intensidade de 0 (estável) a 1 (no teto ou além). */
export function intensidade(crescimento: number, teto = TETO_CRESCIMENTO): number {
  if (!Number.isFinite(crescimento) || teto <= 0) return 0;
  return Math.min(Math.abs(crescimento) / teto, 1);
}

export function corCrescimento(crescimento: number, teto = TETO_CRESCIMENTO): string {
  const t = intensidade(crescimento, teto);
  const alvo = crescimento < 0 ? BAIXA : ALTA;
  return hex(NEUTRO.map((n, i) => n + (alvo[i]! - n) * t));
}

/** Texto do rótulo: claro sobre cor forte, escuro sobre cor clara. */
export function corTextoCrescimento(crescimento: number, teto = TETO_CRESCIMENTO): string {
  return intensidade(crescimento, teto) > 0.55 ? '#ffffff' : '#141d26';
}
