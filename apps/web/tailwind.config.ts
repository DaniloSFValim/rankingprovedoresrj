import type { Config } from 'tailwindcss';

/**
 * Paleta do NETRANK RJ (§43).
 *
 * As cores nao sao decorativas: cada uma tem funcao semantica fixa.
 *  - `alta`  : crescimento, ganho de posicao, expansao
 *  - `baixa` : retracao, perda de posicao, saida
 *  - `neutro`: valores sem juizo de valor (concentracao, contagens)
 *  - `marca` : identidade e elementos de navegacao
 * Series de graficos usam `serie`, uma rampa desenhada para manter contraste
 * entre categorias adjacentes tanto no tema claro quanto no escuro.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        marca: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
          400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
          800: '#155e75', 900: '#164e63', 950: '#083344',
        },
        grafite: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
        alta: '#10b981',
        baixa: '#f43f5e',
        atencao: '#f59e0b',
      },
      fontFamily: {
        sans: ['var(--fonte-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--fonte-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
