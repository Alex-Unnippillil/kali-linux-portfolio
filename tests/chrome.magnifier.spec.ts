import { test, expect } from '@playwright/test';

const TARGET_URL = 'https://example.com';

test('Chrome magnifier follows the cursor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#desktop')).toBeVisible();

  const dock = page.getByLabel('Dock');
  await dock.getByRole('button', { name: 'Google Chrome' }).click();

  const chromeWindow = page.locator('#chrome');
  await expect(chromeWindow).toBeVisible();

  const addressInput = chromeWindow.getByRole('textbox').first();
  await addressInput.fill(TARGET_URL);
  await addressInput.press('Enter');

  await expect(chromeWindow.locator('iframe[src*="example.com"], iframe')).toBeVisible();

  const magnifierToggle = chromeWindow.getByRole('button', { name: 'Enable magnifier' });
  await expect(magnifierToggle).toBeEnabled();
  await magnifierToggle.click();

  const overlay = page.getByTestId('chrome-magnifier');
  await expect(overlay).toBeVisible();

  const viewport = chromeWindow.getByTestId('chrome-viewport');
  const viewportBox = await viewport.boundingBox();
  if (!viewportBox) {
    throw new Error('Unable to determine viewport bounds');
  }

  const start = {
    x: viewportBox.x + viewportBox.width * 0.3,
    y: viewportBox.y + viewportBox.height * 0.5,
  };
  const end = {
    x: viewportBox.x + viewportBox.width * 0.65,
    y: viewportBox.y + viewportBox.height * 0.7,
  };

  await page.mouse.move(start.x, start.y);
  const lens = page.getByTestId('chrome-magnifier-lens');
  await expect(lens).toBeVisible();
  await page.waitForTimeout(120);
  const firstBox = await lens.boundingBox();
  if (!firstBox) {
    throw new Error('Lens position unavailable after initial move');
  }

  await page.mouse.move(end.x, end.y, { steps: 5 });
  await page.waitForTimeout(120);
  const secondBox = await lens.boundingBox();
  if (!secondBox) {
    throw new Error('Lens position unavailable after second move');
  }

  const pointerDeltaX = end.x - start.x;
  const pointerDeltaY = end.y - start.y;
  const lensDeltaX = (secondBox.x ?? 0) - (firstBox.x ?? 0);
  const lensDeltaY = (secondBox.y ?? 0) - (firstBox.y ?? 0);

  expect(Math.abs(lensDeltaX - pointerDeltaX)).toBeLessThan(20);
  expect(Math.abs(lensDeltaY - pointerDeltaY)).toBeLessThan(20);
  expect(Math.hypot(lensDeltaX, lensDeltaY)).toBeGreaterThan(30);

  await chromeWindow.getByRole('button', { name: 'Disable magnifier' }).click();
});
