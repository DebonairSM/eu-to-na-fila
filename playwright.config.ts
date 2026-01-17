import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for EuToNaFila E2E tests
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4040',
    /* Set viewport size - login form might be hidden on small screens */
    viewport: { width: 1280, height: 720 },
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  /* Use PLAYWRIGHT_BROWSERS env var to limit browsers (e.g., "chromium" or "chromium,firefox") */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ].filter((project) => {
    // Allow filtering browsers via env var for faster local testing
    const browsers = process.env.PLAYWRIGHT_BROWSERS;
    if (!browsers) return true;
    return browsers.split(',').includes(project.name);
  }),

  /* Run your local dev server before starting the tests */
  /* Note: Playwright only supports one webServer entry, so we check web server
   * and use a global setup to verify API server is ready */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4040/mineiro',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  /* Global setup to verify API server is ready */
  globalSetup: './tests/global-setup.ts',

  /* Test timeout - increased for rotation tests that need to wait 15s+ */
  timeout: 60 * 1000, // 60 seconds
  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 10 * 1000, // 10 seconds
  },
});

