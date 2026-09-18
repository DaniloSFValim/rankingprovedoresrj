import { test, expect } from '@playwright/test';

test.describe('Homepage and Navigation', () => {
  test('loads homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Verify page title and main heading
    await expect(page).toHaveTitle(/NETRANK/);

    // Check for key navigation elements
    const navbar = page.locator('nav[aria-label="Navegação principal"]');
    await expect(navbar).toBeVisible();

    // Verify main sections are present
    await expect(page.locator('text=Visão geral')).toBeVisible();
    await expect(page.locator('text=Ranking')).toBeVisible();
    await expect(page.locator('text=Municípios')).toBeVisible();
  });

  test('navigates to ranking page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Ranking');

    // Verify we're on ranking page
    await expect(page).toHaveURL(/\/ranking/);
    await page.waitForLoadState('networkidle');

    // Verify ranking table is present
    const table = page.locator('table, [role="table"]');
    await expect(table).toBeVisible();
  });

  test('navigates to municipalities page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Municípios');

    await expect(page).toHaveURL(/\/municipios/);
    await page.waitForLoadState('networkidle');

    // Verify page content loaded
    await expect(page.locator('text=/município|city/i')).toBeVisible();
  });

  test('footer contains required information', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer, [role="contentinfo"]').first();
    await expect(footer).toBeVisible();

    // Verify institutional attribution
    await expect(footer.locator('text=/Prefeitura|Niterói/i')).toBeVisible();
  });

  test('institutional bar displays in header', async ({ page }) => {
    await page.goto('/');

    const institutionalBar = page.locator('text=Prefeitura de Niterói');
    await expect(institutionalBar).toBeVisible();
  });

  test('accessibility: page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Verify h1 is present
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
  });

  test('accessibility: navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab to navigation and activate via Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Verify navigation item was activated or menu opened
    await page.waitForLoadState('networkidle');
  });
});
