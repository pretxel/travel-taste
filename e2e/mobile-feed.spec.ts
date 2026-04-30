import { test, expect, request, devices } from '@playwright/test';
import { ownerLogin, createCode, uploadPost, resetDb } from './helpers';

test.use({ ...devices['iPhone 13'] });

test.beforeEach(async () => {
  resetDb();
});

test('mobile viewport renders 2-col masonry', async ({ baseURL, browser }) => {
  const owner = await request.newContext({ baseURL });
  await ownerLogin(owner);
  for (let i = 0; i < 4; i++) {
    await uploadPost(owner, 'e2e/fixtures/test-image.jpg', `Post ${i}`);
  }
  const code = await createCode(owner, 'M');

  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const v = await ctx.newPage();
  await v.goto('/');
  await v.getByLabel('Your code').fill(code);
  await v.getByRole('button', { name: /enter/i }).click();
  await v.waitForURL('**/feed');

  const tiles = v.locator('a[href^="/feed/"]');
  await expect(tiles).toHaveCount(4);
  const a = await tiles.nth(0).boundingBox();
  const b = await tiles.nth(1).boundingBox();
  expect(a!.x).toBeLessThan(b!.x);
});
