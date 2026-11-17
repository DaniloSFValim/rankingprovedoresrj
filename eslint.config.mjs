// Lint do monorepo: regras do Next (Core Web Vitals) e do TypeScript no site,
// TypeScript recomendado no motor de cálculo e no ETL.
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      'apps/web/out/**',
      'apps/web/public/**',
      'apps/web/next-env.d.ts',
      '.agents/**',
    ],
  },
  ...nextVitals.map((c) => ({ ...c, files: ['apps/web/**/*.{ts,tsx,js,jsx,mjs}'] })),
  ...nextTs.map((c) => ({ ...c, files: ['apps/web/**/*.{ts,tsx}'] })),
  {
    files: ['apps/web/**/*.{ts,tsx,js,jsx,mjs}'],
    settings: { next: { rootDir: 'apps/web' } },
  },
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['packages/**/*.ts', 'scripts/**/*.mjs'] })),
];
