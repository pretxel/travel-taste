import { test, expect } from '@playwright/test';
import { resetDb, OWNER_PWD } from './helpers';

test.beforeEach(async () => {
  resetDb();
});

test('wrong owner password shows error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Owner password').fill('nope');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText('Invalid password')).toBeVisible();
});

test('correct password lands on /admin', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Owner password').fill(OWNER_PWD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/admin');
  await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
});
