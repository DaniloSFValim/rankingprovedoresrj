import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de navegador sobre o site estático compilado (`npm run build` antes).
 * Servir a exportação, e não o `next dev`, testa exatamente o que é publicado.
 *
 * PLAYWRIGHT_CHROMIUM permite apontar um Chromium já instalado (ex.: em
 * ambientes sem acesso ao download do Playwright).
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath },
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
    { name: 'celular', use: { ...devices['Pixel 5'], launchOptions: { executablePath } } },
  ],

  webServer: {
    command: 'npx --yes serve@14 out -l 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
