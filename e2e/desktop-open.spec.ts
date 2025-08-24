import { test, expect } from '../playwright.config';

test('open, minimize, restore, and focus windows', async ({ page }) => {
  await page.goto('/');

  // Wait for desktop to be ready
  const chromeIcon = page.getByTestId('ubuntu-app-chrome');
  await expect(chromeIcon).toBeVisible();

  // Ensure About window is present (auto-opened)
  const aboutWindow = page.getByTestId('window-about-alex');
  await expect(aboutWindow).toBeVisible();

  // Open chrome window
  await chromeIcon.dblclick();
  const chromeWindow = page.getByTestId('window-chrome');
  await expect(chromeWindow).toBeVisible();

  // Minimize and verify hidden
  await chromeWindow.getByRole('button', { name: 'Minimize window' }).click();
  await expect(chromeWindow).toBeHidden();

  // Restore via icon
  await chromeIcon.dblclick();
  await expect(chromeWindow).toBeVisible();

  // Switch focus to About window
  await aboutWindow.click();
  await expect(aboutWindow).toHaveClass(/z-30/);
  await expect(chromeWindow).toHaveClass(/notFocused/);

  // Bring focus back to Chrome window
  await chromeWindow.click();
  await expect(chromeWindow).toHaveClass(/z-30/);
  await expect(aboutWindow).toHaveClass(/notFocused/);
});

test('window resize persists through minimize and restore with no console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('/');

  const chromeIcon = page.getByTestId('ubuntu-app-chrome');
  await expect(chromeIcon).toBeVisible();

  const aboutWindow = page.getByTestId('window-about-alex');
  if (await aboutWindow.isVisible().catch(() => false)) {
    await aboutWindow.getByRole('button', { name: 'Close window' }).click();
    await expect(aboutWindow).toBeHidden();
  }

  await chromeIcon.dblclick();
  const chromeWindow = page.getByTestId('window-chrome');
  await expect(chromeWindow).toBeVisible();

  await page.evaluate(() => {
    const win = document.querySelector('[data-testid="window-chrome"]') as HTMLElement | null;
    if (win) {
      win.style.width = '420px';
      win.style.height = '320px';
    }
  });

  const before = await chromeWindow.boundingBox();
  if (!before) throw new Error('Failed to obtain window bounds');

  await chromeWindow.getByRole('button', { name: 'Minimize window' }).click();
  await expect(chromeWindow).toBeHidden();

  await chromeIcon.dblclick();
  await expect(chromeWindow).toBeVisible();

  const after = await chromeWindow.boundingBox();
  if (!after) throw new Error('Failed to obtain window bounds after restore');

  expect(after.width).toBeCloseTo(before.width, 1);
  expect(after.height).toBeCloseTo(before.height, 1);
  expect(after.x).toBeCloseTo(before.x, 1);
  expect(after.y).toBeCloseTo(before.y, 1);

  await chromeWindow.getByRole('button', { name: 'Close window' }).click();
  await expect(chromeWindow).toBeHidden();

  expect(consoleErrors).toEqual([]);
});
