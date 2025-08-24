import { test, expect } from '@playwright/test';

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
