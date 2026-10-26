import { defineConfig } from '@playwright/test';

/**
 * Browser tests for the playable game. Uses the locally installed Google
 * Chrome by default (no browser download); set PW_BROWSER=bundled to use
 * Playwright's own Chromium after `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    ...(process.env.PW_BROWSER === 'bundled' ? {} : { channel: 'chrome' }),
    // Reduced motion also shortens the computer player's delay.
    contextOptions: { reducedMotion: 'reduce' },
    viewport: { width: 1400, height: 900 },
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
