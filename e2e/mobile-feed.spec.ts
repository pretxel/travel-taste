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
  await v.getByRole('button', { name: /open the letter|stamping/i }).click();
  await v.waitForURL('**/feed');

  const tiles = v.locator('a[href^="/feed/"]');
  await expect(tiles).toHaveCount(4);
  const xs = await Promise.all([0, 1, 2, 3].map(async i => (await tiles.nth(i).boundingBox())!.x));
  // 2-col masonry → at least 2 distinct x positions across the 4 tiles.
  expect(new Set(xs).size).toBeGreaterThanOrEqual(2);
});
