import { test, expect } from '@playwright/test';
import { resetDb } from './helpers';

test.beforeEach(async () => {
  resetDb();
});

test('invalid code stays on landing with inline error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your code').fill('ZZZZZ-ZZZZZ');
  await page.getByRole('button', { name: /open the letter|stamping/i }).click();
  await expect(page.getByText(/that code does not match/i)).toBeVisible();
  expect(page.url()).toMatch(/\/$/);
});
