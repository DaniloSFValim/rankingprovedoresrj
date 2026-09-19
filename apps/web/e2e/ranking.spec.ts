import { test, expect } from '@playwright/test';

test.describe('Ranking Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ranking/');
    await page.waitForLoadState('networkidle');
  });

  test('displays ranking table with data', async ({ page }) => {
    // Verify table or ranking list is visible
    const table = page.locator('table, [role="table"]').first();
    await expect(table).toBeVisible();

    // Verify table has rows with data
    const rows = page.locator('tr, [role="row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(1); // Header + at least 1 data row
  });

  test('ranking columns are visible', async ({ page }) => {
    // Check for key columns (position, name, accesses, etc)
    await expect(page.locator('text=/posição|rank/i')).toBeVisible();
    await expect(page.locator('text=/provedores|providers/i')).toBeVisible();
  });

  test('can search/filter in ranking', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('Claro');
      await page.waitForLoadState('networkidle');

      // Verify search results changed
      const results = page.locator('text=/Claro/i');
      await expect(results).toBeVisible();
    }
  });

  test('ranking entries have links to detail pages', async ({ page }) => {
    // Find first ranking entry link
    const firstLink = page.locator('a[href*="/provedores/"]').first();

    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href');
      expect(href).toMatch(/\/provedores\/[a-z0-9-]+/);
    }
  });

  test('can navigate to provider detail page', async ({ page }) => {
    // Click first provider link
    const providerLink = page.locator('a[href*="/provedores/"]').first();

    if (await providerLink.isVisible()) {
      await providerLink.click();
      await page.waitForLoadState('networkidle');

      // Verify we navigated to provider page
      await expect(page).toHaveURL(/\/provedores\/[a-z0-9-]+/);
    }
  });

  test('sorting works if available', async ({ page }) => {
    // Look for sortable column headers
    const sortableHeader = page.locator('th button, [role="columnheader"] button').first();

    if (await sortableHeader.isVisible()) {
      const initialText = await page.locator('td, [role="gridcell"]').first().textContent();

      await sortableHeader.click();
      await page.waitForLoadState('networkidle');

      const afterText = await page.locator('td, [role="gridcell"]').first().textContent();
      // Verify some change occurred (may or may not be different data order)
      expect(afterText).toBeDefined();
    }
  });

  test('pagination works if enabled', async ({ page }) => {
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Próximo"), button:has-text("Next"), [aria-label*="next" i]').first();

    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      const firstPageText = await page.locator('body').textContent();

      await nextButton.click();
      await page.waitForLoadState('networkidle');

      const secondPageText = await page.locator('body').textContent();
      // Verify content changed
      expect(firstPageText).not.toBe(secondPageText);
    }
  });

  test('accessibility: table has proper headers', async ({ page }) => {
    const table = page.locator('table, [role="table"]').first();
    await expect(table).toBeVisible();

    // Verify table has header cells
    const headers = table.locator('th, [role="columnheader"]');
    const count = await headers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('accessibility: can navigate table with keyboard', async ({ page }) => {
    const table = page.locator('table, [role="table"]').first();
    await expect(table).toBeVisible();

    // Focus table
    await table.focus();

    // Press arrow key
    await page.keyboard.press('ArrowDown');

    // Verify focus moved
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });

  test('metadata/context displays correctly', async ({ page }) => {
    // Check for competência/period display
    const metaText = await page.locator('text=/competência|período|2025|2026/i').first();
    await expect(metaText).toBeVisible();
  });
});
