import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('Password').fill('travel123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Bali' })).toBeVisible();
}

test.describe('gallery layout', () => {
  test('renders sections alphabetically', async ({ page }) => {
    await login(page);
    const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
    expect(headings).toEqual(['Bali', 'Kyoto', 'Santorini']);
  });

  test('renders expected tile counts per section', async ({ page }) => {
    await login(page);
    const counts: Record<string, number> = { bali: 2, kyoto: 3, santorini: 4 };
    for (const [slug, count] of Object.entries(counts)) {
      const section = page.locator(`section[aria-labelledby="section-${slug}"]`);
      await expect(section.getByRole('button', { name: /Open photo/ })).toHaveCount(count);
    }
  });
});
