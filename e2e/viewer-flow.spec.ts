import { test, expect, request } from '@playwright/test';
import { ownerLogin, createCode, uploadPost, resetDb } from './helpers';

test.beforeEach(async () => {
  resetDb();
});

test('viewer enters code, sees feed, opens detail', async ({ page, baseURL }) => {
  const owner = await request.newContext({ baseURL });
  await ownerLogin(owner);
  await uploadPost(owner, 'e2e/fixtures/test-image.jpg', 'Hello world');
  const code = await createCode(owner, 'E2E');

  await page.goto('/');
  await page.getByLabel('Your code').fill(code);
  await page.getByRole('button', { name: /open the letter|stamping/i }).click();
  await page.waitForURL('**/feed');
  await expect(page.locator('img').first()).toBeVisible();
  await page.locator('a[href^="/feed/"]').first().click();
  await expect(page.getByText('Hello world')).toBeVisible();
});
