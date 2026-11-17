/**
 * Fluxos principais do site estático publicado: carregamento, navegação,
 * acessibilidade (WCAG 2.1 AA via axe-core), responsividade e identificação
 * acadêmica. Roda nos projetos "desktop" e "celular" (playwright.config.ts).
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const PAGINAS = [
  '/',
  '/ranking/',
  '/crescimento/',
  '/municipios/',
  '/municipios/niteroi/',
  '/provedores/',
  '/provedores/claro/',
  '/sobre/',
];

/** Coleta erros de JavaScript e de console durante a navegação. */
function vigiarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  return erros;
}

type Axe = {
  run: (d: Document, o: object) => Promise<{ violations: Array<{ id: string; nodes: unknown[] }> }>;
};

for (const caminho of PAGINAS) {
  test.describe(`página ${caminho}`, () => {
    test('carrega sem erros, com título e conteúdo principal', async ({ page }) => {
      const erros = vigiarErros(page);
      const resposta = await page.goto(caminho);
      expect(resposta?.status()).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('main')).toHaveCount(1);
      await page.waitForLoadState('networkidle');
      expect(erros).toEqual([]);
    });

    test('não tem violações WCAG 2.1 AA (axe-core)', async ({ page }) => {
      await page.goto(caminho);
      await page.waitForLoadState('networkidle');
      await page.addScriptTag({ content: AXE });
      const violacoes = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: Axe }).axe;
        const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] });
        return r.violations.map((v) => `${v.id} (${v.nodes.length})`);
      });
      expect(violacoes).toEqual([]);
    });

    test('não rola na horizontal', async ({ page }) => {
      await page.goto(caminho);
      await page.waitForLoadState('networkidle');
      const excesso = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(excesso).toBeLessThanOrEqual(1);
    });
  });
}

test('página inexistente responde 404 com navegação de volta', async ({ page }) => {
  const resposta = await page.goto('/pagina-que-nao-existe/');
  expect(resposta?.status()).toBe(404);
  await expect(page.locator('header a[href="/"]').first()).toBeVisible();
});

test('do ranking chega à página de um provedor', async ({ page }) => {
  await page.goto('/ranking/');
  const tabela = page.locator('table').last();
  await expect(tabela.locator('th').first()).toBeVisible();
  const primeiro = tabela.locator('tbody a[href^="/provedores/"]').first();
  const destino = await primeiro.getAttribute('href');
  await primeiro.click();
  await expect(page).toHaveURL(new RegExp(`${destino}$`));
  await expect(page.locator('h1')).toBeVisible();
});

test('rodapé identifica autoria, ORCID e DOI sem vínculo institucional', async ({ page }) => {
  await page.goto('/');
  const rodape = page.locator('footer');
  await expect(rodape.locator('a[href="https://orcid.org/0009-0009-7250-6151"]')).toBeVisible();
  await expect(rodape.locator('a[href^="https://doi.org/10.5281/zenodo."]').first()).toBeVisible();
  await expect(rodape).not.toContainText(/Seconser|Prefeitura|Secretaria Municipal/i);
});

test('página Sobre apresenta citação com DOI de conceito', async ({ page }) => {
  await page.goto('/sobre/');
  await expect(page.locator('#main-content')).toContainText('Zenodo');
  await expect(
    page.locator('#main-content a[href="https://doi.org/10.5281/zenodo.22839933"]').first(),
  ).toBeVisible();
  await expect(page.locator('#main-content')).not.toContainText(/Seconser|Prefeitura de Niterói/i);
});
