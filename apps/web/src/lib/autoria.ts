import type { MetadadosAcademicos } from '@netrank/core';

/**
 * Autoria e registro do projeto. Fonte única para o site, espelhada em
 * CITATION.cff e .zenodo.json na raiz do repositório.
 */
export const AUTORIA: MetadadosAcademicos = {
  autores: [{ nome: 'Danilo S. F. Valim', orcid: '0009-0009-7250-6151' }],
  afiliacao:
    'Universidade Federal Rural do Rio de Janeiro (UFRRJ) — Pós-Graduação em Análise de Dados Aplicadas a Políticas Públicas',
  doi: '10.5281/zenodo.22839933',
  versaoDataset: '1.1.0',
  licenca: 'CC-BY-4.0',
  // GITHUB_SHA existe no build do GitHub Actions; localmente cai para main.
  commitHash: process.env.GITHUB_SHA ?? 'main',
  urlRepositorio: 'https://github.com/DaniloSFValim/rankingprovedoresrj',
};
