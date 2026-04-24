import { test, expect } from '@playwright/test';

test.describe('auth gate', () => {
  test('rejects wrong password', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Password').fill('nope');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid password')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('accepts correct password and reveals gallery', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Password').fill('travel123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Bali' })).toBeVisible();
  });
});
