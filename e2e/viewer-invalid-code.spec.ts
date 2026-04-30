import { test, expect } from '@playwright/test';
import { resetDb } from './helpers';

test.beforeEach(async () => {
  resetDb();
});

test('invalid code stays on landing with inline error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your code').fill('ZZZZZ-ZZZZZ');
  await page.getByRole('button', { name: /enter/i }).click();
  await expect(page.getByText('Invalid code')).toBeVisible();
  expect(page.url()).toMatch(/\/$/);
});
