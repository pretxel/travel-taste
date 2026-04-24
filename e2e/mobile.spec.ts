import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

// 1x1 transparent PNG so Cloudinary image requests resolve with real pixel
// dimensions and the swipe surface gets a non-zero bounding box.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64'
);

async function stubCloudinary(page: Page) {
  await page.route('**/res.cloudinary.com/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: PNG_1x1,
    });
  });
}

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Password').fill('travel123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Bali' })).toBeVisible();
}

async function swipe(page: Page, dx: number) {
  const surface = page.getByTestId('modal-swipe-surface');
  await expect(surface).toBeVisible();
  // Dispatch pointer events directly so the swipe works even if the surface
  // height is fragile under emulated mobile rendering.
  await surface.evaluate((el, delta) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2 || rect.top + 10;
    const opts = { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 1 };
    el.dispatchEvent(
      new PointerEvent('pointerdown', { ...opts, clientX: cx - delta / 2, clientY: cy })
    );
    el.dispatchEvent(
      new PointerEvent('pointerup', { ...opts, clientX: cx + delta / 2, clientY: cy })
    );
  }, dx);
}

test.describe('mobile gallery (mobile-chrome only)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile-chrome', 'mobile only');
    await stubCloudinary(page);
  });

  test('swipe left advances to next image', async ({ page }) => {
    await login(page);
    await page
      .locator('section[aria-labelledby="section-santorini"]')
      .getByRole('button', { name: /Open photo/ })
      .first()
      .click();
    await expect(page.locator('p').getByText('travel-taste/santorini/sunset-01')).toBeVisible();

    await swipe(page, -240);

    await expect(page.locator('p').getByText('travel-taste/santorini/blue-dome-02')).toBeVisible();
  });

  test('swipe right returns to previous image', async ({ page }) => {
    await login(page);
    const tiles = page
      .locator('section[aria-labelledby="section-santorini"]')
      .getByRole('button', { name: /Open photo/ });
    await tiles.nth(1).click();
    await expect(page.locator('p').getByText('travel-taste/santorini/blue-dome-02')).toBeVisible();

    await swipe(page, 240);

    await expect(page.locator('p').getByText('travel-taste/santorini/sunset-01')).toBeVisible();
  });

  test('masonry renders two columns at mobile width', async ({ page }) => {
    await login(page);
    const section = page.locator('section[aria-labelledby="section-kyoto"]');
    const grid = section.locator('> div').first();
    const columnCount = await grid.evaluate(el => getComputedStyle(el).columnCount);
    expect(columnCount).toBe('2');
  });
});
