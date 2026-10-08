import { defineConfig, devices } from '@playwright/test';

/**
 * Three targets:
 *  · "site"  the production build, served with Vercel's routing emulated
 *            (npm run build first; npm run preview serves .vercel/output)
 *  · "forms" `astro dev`, the only local way to run the serverless form endpoints
 *  · "admin" `astro dev` too: the operations console on its mock data
 *
 * CI installs Chromium. Locally, PW_CHANNEL=msedge (or chrome) uses an
 * installed browser instead of downloading one.
 */
const channel = process.env.PW_CHANNEL;
const browser = { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) };

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'site',
      testIgnore: /(forms|admin|admin-api|admin-mode)\.spec\.ts/,
      use: { ...browser, baseURL: 'http://localhost:4321' },
    },
    {
      name: 'forms',
      testMatch: /forms\.spec\.ts/,
      use: { ...browser, baseURL: 'http://localhost:4322' },
    },
    {
      name: 'admin',
      testMatch: /admin(-api|-mode)?\.spec\.ts/,
      use: { ...browser, baseURL: 'http://localhost:4322', acceptDownloads: true },
    },
  ],
  webServer: [
    { command: 'node scripts/serve.mjs', port: 4321, reuseExistingServer: !process.env.CI },
    { command: 'npx astro dev --port 4322', port: 4322, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
});
