import { defineConfig, devices } from '@playwright/test';

const env = {
  NODE_ENV: 'test',
  PORT: '3010',
  OWNER_PASSWORD: 'e2e-owner-pwd',
  VIEWER_JWT_SECRET: process.env.VIEWER_JWT_SECRET ?? 'a'.repeat(43),
  OWNER_JWT_SECRET: process.env.OWNER_JWT_SECRET ?? 'b'.repeat(43),
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3010',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3010',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env,
  },
});
