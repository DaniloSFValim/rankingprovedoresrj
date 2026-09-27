import type { Config } from 'tailwindcss';

/**
 * Paleta do NETRANK RJ.
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
        // Tema claro. As escalas seguem a convencao "50 = mais forte": 50 e a
        // tinta, 950 o papel. Assim text-grafite-100 e texto principal e
        // bg-grafite-950 e o fundo da pagina.
        marca: {
          50: '#062f37', 100: '#08404a', 200: '#0a4f5b', 300: '#0b5b68',
          400: '#0b6572', 500: '#0e7482', 600: '#0b5f6b', 700: '#8fc1c6',
          800: '#bfdcde', 900: '#dcedee', 950: '#eef6f6',
        },
        grafite: {
          50: '#141d26', 100: '#1f2a35', 200: '#2e3a46', 300: '#44515e',
          400: '#56626e', 500: '#66717c', 600: '#a3acb4', 700: '#cdd4d8',
          800: '#e1e6e8', 900: '#ffffff', 950: '#f3f5f4',
        },
        tinta: '#141d26',
        alta: '#1e7b4c',
        baixa: '#b3372c',
        atencao: '#8f5b00',
      },
      fontFamily: {
        sans: ['var(--fonte-sans)', 'system-ui', 'sans-serif'],
              },
    },
  },
  plugins: [],
};
export default config;
