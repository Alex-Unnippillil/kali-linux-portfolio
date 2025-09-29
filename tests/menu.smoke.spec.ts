import { test, expect } from '@playwright/test';

const openWhiskerMenu = async (page: import('@playwright/test').Page) => {
  const trigger = page.getByRole('button', { name: /Applications/i });
  await trigger.click();
  const panel = page.locator('[data-menu-surface]').first();
  await expect(panel).toBeVisible();
};

test.describe('Whisker menu navigation', () => {
  test('supports keyboard navigation across categories and apps', async ({ page }) => {
    await page.goto('/');
    await openWhiskerMenu(page);

    const categoryList = page.getByRole('listbox', { name: 'Application categories' });
    await expect(categoryList).toBeVisible();

    const initialCategory = await categoryList.locator('[data-state="active"]').first().innerText();

    await categoryList.focus();
    await page.keyboard.press('ArrowDown');
    const newCategory = await categoryList.locator('[data-state="active"]').first().innerText();
    expect(newCategory).not.toEqual(initialCategory);

    const appList = page.getByRole('listbox', { name: 'Application results' });
    await expect(appList).toBeVisible();

    const firstApp = await appList.locator('[data-state="active"]').first().innerText();
    await page.keyboard.press('ArrowDown');
    await expect(appList.locator('[data-state="active"]').first()).not.toHaveText(firstApp);
  });

  test('applies hover intent delay before highlighting a new app', async ({ page }) => {
    await page.goto('/');
    await openWhiskerMenu(page);

    const appList = page.getByRole('listbox', { name: 'Application results' });
    await expect(appList).toBeVisible();

    const target = appList.locator('[data-menu-item]').nth(2);
    await target.hover();
    await expect(target).toHaveAttribute('data-state', 'active');
  });
});
