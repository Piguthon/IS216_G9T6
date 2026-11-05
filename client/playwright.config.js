import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// End-to-end tests for FairSpot (run with `pnpm test:e2e`).
export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 5000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:5173',

    trace: 'on-first-retry',

    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: [
    {
      command: 'pnpm --dir ../server dev',
      port: 8000,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm dev',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
})
