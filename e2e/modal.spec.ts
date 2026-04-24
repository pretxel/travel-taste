import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Password').fill('travel123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Bali' })).toBeVisible();
}

function caption(page: Page, publicId: string) {
  return page.locator('p').getByText(publicId);
}

test.describe('modal navigation', () => {
  test('opens modal showing the clicked photo public_id', async ({ page }) => {
    await login(page);
    const firstTile = page
      .locator('section[aria-labelledby="section-bali"]')
      .getByRole('button', { name: /Open photo/ })
      .first();
    await firstTile.click();
    await expect(caption(page, 'travel-taste/bali/beach-01')).toBeVisible();
  });

  test('ArrowRight wraps within section', async ({ page }) => {
    await login(page);
    await page
      .locator('section[aria-labelledby="section-santorini"]')
      .getByRole('button', { name: /Open photo/ })
      .first()
      .click();
    const first = 'travel-taste/santorini/sunset-01';
    await expect(caption(page, first)).toBeVisible();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await expect(caption(page, first)).toBeVisible();
  });

  test('Escape closes the modal', async ({ page }) => {
    await login(page);
    await page
      .locator('section[aria-labelledby="section-bali"]')
      .getByRole('button', { name: /Open photo/ })
      .first()
      .click();
    await expect(caption(page, 'travel-taste/bali/beach-01')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(caption(page, 'travel-taste/bali/beach-01')).toBeHidden();
  });

  test('modal scope stays within its section when navigating', async ({ page }) => {
    await login(page);
    const baliButtons = page
      .locator('section[aria-labelledby="section-bali"]')
      .getByRole('button', { name: /Open photo/ });
    await baliButtons.nth(1).click();
    await expect(caption(page, 'travel-taste/bali/temple-02')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(caption(page, 'travel-taste/bali/beach-01')).toBeVisible();
  });
});
