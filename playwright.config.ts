import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/e2e-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['line']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for actions */
    actionTimeout: 10000,

    /* Global timeout for navigation */
    navigationTimeout: 30000,

    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,

    /* Viewport */
    viewport: { width: 1280, height: 720 },

    /* Locale */
    locale: 'en-US',

    /* Timezone */
    timezoneId: 'America/New_York'
  },

  /* Configure projects for major browsers */
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

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* Test environments */
  // globalSetup: './tests/e2e/global-setup.ts',
  // globalTeardown: './tests/e2e/global-teardown.ts',

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run nvm:dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes
      env: {
        NODE_ENV: 'test'
      }
    },
    // Backend server (if needed for E2E tests)
    // {
    //   command: 'cd ../ShopTrack.Api && dotnet run --urls http://localhost:5201',
    //   url: 'http://localhost:5201/api/health',
    //   reuseExistingServer: !process.env.CI,
    //   timeout: 60 * 1000 // 1 minute
    // }
  ],

  /* Test timeouts */
  timeout: 60 * 1000, // 1 minute per test
  expect: {
    timeout: 10 * 1000 // 10 seconds for assertions
  },

  /* Test patterns */
  testMatch: [
    '**/*.e2e.{js,ts}',
    '**/e2e/**/*.{test,spec}.{js,ts}'
  ],

  /* Output directory */
  outputDir: 'test-results/e2e-artifacts',

  /* Metadata */
  metadata: {
    'test-type': 'e2e',
    'application': 'shoptrack-frontend',
    'environment': process.env.NODE_ENV || 'test'
  }
});