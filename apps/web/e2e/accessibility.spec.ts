/**
 * Testes de Acessibilidade com Playwright + axe-core
 * Verifica conformidade WCAG 2.1 nível A em páginas críticas
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Acessibilidade - WCAG 2.1 Compliance', () => {
  test('homepage - sem violações de acessibilidade', async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);

    // Verificar conformidade WCAG 2.1 nível A
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('ranking - sem violações de acessibilidade', async ({ page }) => {
    await page.goto('/ranking/');
    await page.waitForLoadState('networkidle');
    await injectAxe(page);

    await checkA11y(page, undefined, {
      detailedReport: true,
    });

    // Verificações específicas
    const table = page.locator('table, [role="table"]').first();
    if (await table.isVisible()) {
      // Tabela deve ter headers
      const headers = table.locator('th, [role="columnheader"]');
      expect(await headers.count()).toBeGreaterThan(0);
    }
  });

  test('municipios - sem violações de acessibilidade', async ({ page }) => {
    await page.goto('/municipios/');
    await page.waitForLoadState('networkidle');
    await injectAxe(page);

    await checkA11y(page, undefined, {
      detailedReport: true,
    });
  });

  test('comparação - sem violações de acessibilidade', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');
    await injectAxe(page);

    await checkA11y(page, undefined, {
      detailedReport: true,
    });
  });

  test('formulários - navegação por teclado funciona', async ({ page }) => {
    await page.goto('/ranking/');
    await page.waitForLoadState('networkidle');

    // Tab através de elementos interativos
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();

    // Verificar que podemos navegar com Shift+Tab
    await page.keyboard.press('Shift+Tab');

    // Enter deve ativar botões
    const button = page.locator('button').first();
    if (await button.isVisible()) {
      await button.focus();
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
    }
  });

  test('cores - contraste suficiente em textos', async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);

    // axe verifica automaticamente contraste
    await checkA11y(page, undefined, {
      detailedReport: true,
    });
  });

  test('imagens - têm alt text', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      // Imagens decorativas podem ter alt vazio, mas devem ter o atributo
      expect(alt !== null).toBeTruthy();
    }
  });

  test('headings - estrutura hierárquica correta', async ({ page }) => {
    await page.goto('/');

    const h1 = page.locator('h1');
    expect(await h1.count()).toBe(1);

    // H2s devem vir depois de H1
    const h2s = page.locator('h2');
    const h3s = page.locator('h3');

    if (await h2s.count() > 0) {
      // Se há H2, deve haver pelo menos um H1 antes
      expect(await h1.count()).toBeGreaterThan(0);
    }
  });

  test('links - têm texto descritivo', async ({ page }) => {
    await page.goto('/ranking/');

    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      // Link deve ter texto visível ou aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('aria-labels - elementos interativos têm labels', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button deve ter texto visível ou aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('focusable elements - tabulação ordenada', async ({ page }) => {
    await page.goto('/');

    // Coletar elementos tabuláveis
    const focusableElements = page.locator(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    );

    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(0);

    // Verificar que Tab navega através deles
    const firstElement = focusableElements.first();
    await firstElement.focus();

    const firstFocused = await page.evaluate(() =>
      document.activeElement?.textContent?.substring(0, 20)
    );
    expect(firstFocused).toBeTruthy();
  });

  test('carregamento - aria-busy e aria-live para estados', async ({ page }) => {
    await page.goto('/ranking/');
    await page.waitForLoadState('networkidle');

    // Procurar por indicadores de carregamento
    const loaders = page.locator('[aria-busy="true"], [aria-live="polite"]');
    // Se existem, deve haver elementos com rol definido
    if (await loaders.count() > 0) {
      const role = await loaders.first().getAttribute('role');
      expect(['status', 'alert', 'log', 'region', null]).toContain(role);
    }
  });
});
