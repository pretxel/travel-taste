import { test, expect } from '@playwright/test';
import { resetDb } from './helpers';

test.beforeEach(async () => {
  resetDb();
});

test('11 wrong codes triggers 429 message', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 10; i++) {
    await page.getByLabel('Your code').fill('ZZZZZ-ZZZZZ');
    await page.getByRole('button', { name: /open the letter|stamping/i }).click();
    await expect(page.getByText(/that code does not match/i)).toBeVisible();
  }
  await page.getByLabel('Your code').fill('ZZZZZ-ZZZZZ');
  await page.getByRole('button', { name: /open the letter|stamping/i }).click();
  await expect(page.getByText(/Too many attempts/)).toBeVisible();
});
