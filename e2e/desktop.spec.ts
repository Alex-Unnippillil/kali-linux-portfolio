import { test, expect } from '../playwright.config';

// Helper to close an app window by title if it is open
async function closeWindowByTitle(page, title) {
  const window = page.getByRole('dialog', { name: title });
  if (await window.isVisible().catch(() => false)) {
    await window.getByRole('button', { name: 'Close window' }).click();
    await expect(window).toBeHidden();
  }
}

test('desktop icons open apps', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
  });
  await page.goto('/');

  // Wait for desktop to load
  const firefoxIcon = page.getByLabel('Open Firefox');
  await firefoxIcon.waitFor();

  // Close the automatically opened About Alex window if present
  await closeWindowByTitle(page, 'About Alex');

  // Open Firefox
  await firefoxIcon.dblclick();
  const firefoxWindow = page.getByRole('dialog', { name: 'Firefox' });
  await expect(firefoxWindow).toBeVisible();
  await firefoxWindow.getByRole('button', { name: 'Close window' }).click();
  await expect(firefoxWindow).toBeHidden();

  // Open Contact Me app
  const contactIcon = page.getByLabel('Open Contact Me');
  await contactIcon.dblclick();
  const contactWindow = page.getByRole('dialog', { name: 'Contact Me' });
  await expect(contactWindow).toBeVisible();
  await contactWindow.getByRole('button', { name: 'Close window' }).click();
  await expect(contactWindow).toBeHidden();
});
