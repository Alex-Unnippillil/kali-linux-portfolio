import { test, expect } from '@playwright/test';

test.describe('mobile back button', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('navigates back to the apps index on mobile', async ({ page }) => {
    await page.goto('/apps/converter');
    const backButton = page.getByTestId('mobile-back-button');
    await expect(backButton).toBeVisible();
    await backButton.click();
    await expect(page).toHaveURL(/\/apps$/);
  });
});
