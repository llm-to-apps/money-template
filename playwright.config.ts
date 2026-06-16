import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.RUN_DB_E2E === '1' ? 3006 : 3005;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  workers: process.env.RUN_DB_E2E === '1' ? 1 : undefined,
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}`,
    trace: 'on-first-retry'
  },
  webServer: {
    command: `next dev --hostname 0.0.0.0 --port ${e2ePort}`,
    reuseExistingServer: !process.env.CI && process.env.RUN_DB_E2E !== '1',
    timeout: 120_000,
    url: `http://127.0.0.1:${e2ePort}/api/health`
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
