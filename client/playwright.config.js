import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests for FairSpot (run with `pnpm test:e2e`).
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run for. results-voting.spec.js marks itself slow (x3). */
  timeout: 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* A list in the terminal, plus the HTML report (open it with `pnpm exec playwright show-report`) */
  reporter: [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Run without a window; add --headed (or use --ui) to watch the tests */
    headless: true,
  },

  /* Chromium only: the app is graded in Chrome */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* Start the Express API and the Vite dev server before the tests (or reuse running ones) */
  webServer: [
    {
      /* The Express API (server/): needs server/.env and a reachable MongoDB. It waits for the
         port, not /api/health, which answers 503 whenever OneMap can't issue a token */
      command: 'pnpm --dir ../server dev',
      port: 8000,
      reuseExistingServer: true,
    },
    {
      /* The Vue app (client/) */
      command: 'pnpm dev',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
})
