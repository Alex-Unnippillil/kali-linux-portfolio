import { test, expect } from '@playwright/test';

test('helpers pane shows documentation links', async ({ page }) => {
  await page.goto('/apps/settings');
  const pane = page.getByLabel('explainer pane');
  await expect(pane).toBeVisible();

  const links = pane.locator('a');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(links.nth(i)).toHaveAttribute('target', '_blank');
    const href = await links.nth(i).getAttribute('href');
    expect(href).toMatch(/^https?:/);
  }
});
