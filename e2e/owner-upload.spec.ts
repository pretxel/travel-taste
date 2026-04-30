import { test, expect, request } from '@playwright/test';
import { ownerLogin, createCode, resetDb, OWNER_PWD } from './helpers';

test.beforeEach(async () => {
  resetDb();
});

test('owner uploads a post; viewer sees it', async ({ page, baseURL, browser }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Owner password').fill(OWNER_PWD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/admin');
  await page.getByRole('link', { name: /new post/i }).click();
  await page.setInputFiles('input[type="file"]', 'e2e/fixtures/test-image.jpg');
  await page.getByLabel('Caption').fill('Sunset');
  await page.getByRole('button', { name: 'Post' }).click();
  await page.waitForURL('**/admin');
  await expect(page.getByText('Sunset')).toBeVisible();

  const owner = await request.newContext({ baseURL });
  await ownerLogin(owner);
  const code = await createCode(owner, 'V');

  const fresh = await browser.newContext();
  const viewer = await fresh.newPage();
  await viewer.goto('/');
  await viewer.getByLabel('Your code').fill(code);
  await viewer.getByRole('button', { name: /enter/i }).click();
  await viewer.waitForURL('**/feed');
  await expect(viewer.locator('img').first()).toBeVisible();
});
