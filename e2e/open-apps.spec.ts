import { test, expect } from '@playwright/test';

export default test('open apps from desktop', async ({ page }) => {
  await page.goto('/');
  const firefoxIcon = page.getByAltText('Kali Firefox');
  await expect(firefoxIcon).toBeVisible();
  await firefoxIcon.dblclick();
  const chromeWindow = page.getByTestId('window-chrome');
  await expect(chromeWindow).toBeVisible();
});

