import { test, expect, request } from '@playwright/test';
import { ownerLogin, createCode, uploadPost, resetDb } from './helpers';

test.beforeEach(async () => {
  resetDb();
});

test('revoking a code kicks the viewer back to /', async ({ baseURL, browser }) => {
  const owner = await request.newContext({ baseURL });
  await ownerLogin(owner);
  await uploadPost(owner, 'e2e/fixtures/test-image.jpg', 'before revoke');
  const code = await createCode(owner, 'X');

  const ctx = await browser.newContext();
  const viewer = await ctx.newPage();
  await viewer.goto('/');
  await viewer.getByLabel('Your code').fill(code);
  await viewer.getByRole('button', { name: /enter/i }).click();
  await viewer.waitForURL('**/feed');

  const list = await (await owner.get('/api/admin/codes')).json();
  const id = list.codes[0].id;
  await owner.delete(`/api/admin/codes/${id}`);

  await viewer.reload();
  await viewer.waitForURL('**/');
  await expect(viewer.getByLabel('Your code')).toBeVisible();
});
