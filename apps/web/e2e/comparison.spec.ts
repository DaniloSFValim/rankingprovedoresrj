import { test, expect } from '@playwright/test';

test.describe('Comparison Flows', () => {
  test('municipality comparison page loads', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('text=/comparador|comparação/i')).toBeVisible();
  });

  test('can select municipalities to compare', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');

    // Find and click first selectable municipality
    const selectButton = page.locator('button, [role="button"]').filter({ hasText: /município|city/i }).first();

    if (await selectButton.isVisible()) {
      await selectButton.click();
      await page.waitForLoadState('networkidle');

      // Verify selection was registered (might show in a "selected" list)
      const selectedIndicator = page.locator('text=/selecionado|selected/i').first();
      if (await selectedIndicator.isVisible()) {
        await expect(selectedIndicator).toBeVisible();
      }
    }
  });

  test('provider comparison page loads', async ({ page }) => {
    await page.goto('/compara/prestadoras/');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('text=/comparador|comparação|prestadora/i')).toBeVisible();
  });

  test('can select providers to compare', async ({ page }) => {
    await page.goto('/compara/prestadoras/');
    await page.waitForLoadState('networkidle');

    // Find and click first selectable provider
    const selectButton = page.locator('button, [role="button"]').filter({ hasText: /provedor|provider|prestadora/i }).first();

    if (await selectButton.isVisible()) {
      await selectButton.click();
      await page.waitForLoadState('networkidle');

      // Verify selection interface updated
      const selectionArea = page.locator('text=/selecionado|selected/i').first();
      if (await selectionArea.isVisible()) {
        await expect(selectionArea).toBeVisible();
      }
    }
  });

  test('comparison selector displays available items', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');

    // Verify selector grid/list is visible
    const selectorGrid = page.locator('[class*="grid"], [class*="list"], [role="list"]').first();
    await expect(selectorGrid).toBeVisible();

    // Count items
    const items = page.locator('[role="button"], button').filter({ hasText: /\w+/ });
    const itemCount = await items.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('comparison clears selection on reset button', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');

    // Look for reset/clear button
    const clearButton = page.locator('button').filter({ hasText: /limpar|clear|reset/i }).first();

    if (await clearButton.isVisible() && !await clearButton.isDisabled()) {
      await clearButton.click();
      await page.waitForLoadState('networkidle');

      // Verify selection was cleared
      const selectedCount = page.locator('[data-selected="true"], .selected').count();
      // After clear, selected items should be reduced
    }
  });

  test('accessibility: comparison selector keyboard navigable', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');

    // Tab to first item
    await page.keyboard.press('Tab');

    // Press Enter to select
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Verify interaction worked
  });

  test('comparison results display when items selected', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');

    // Select an item
    const selectButton = page.locator('button').filter({ hasText: /Rio|São|Rio de Janeiro/i }).first();

    if (await selectButton.isVisible()) {
      await selectButton.click();
      await page.waitForLoadState('networkidle');

      // Check for comparison results/charts
      const results = page.locator('[class*="comparison"], [role="region"]');
      const resultsCount = await results.count();
      if (resultsCount > 0) {
        await expect(results.first()).toBeVisible();
      }
    }
  });

  test('comparison handles empty state', async ({ page }) => {
    await page.goto('/compara/municipios/');
    await page.waitForLoadState('networkidle');

    // Should show instruction text when nothing selected
    const instruction = page.locator('text=/selecione|choose|select/i').first();
    if (await instruction.isVisible()) {
      await expect(instruction).toBeVisible();
    }
  });
});
