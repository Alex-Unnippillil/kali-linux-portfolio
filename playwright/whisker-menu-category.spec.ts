import { test, expect } from '@playwright/test';

const openWhiskerMenu = async (page) => {
  await page.goto('http://localhost:3000/');
  const trigger = page.getByRole('button', { name: 'Applications' });
  await trigger.click();
  const menu = page.getByTestId('whisker-menu-dropdown');
  await expect(menu).toBeVisible();
  return menu;
};

test('remembers selected category when reopening the whisker menu', async ({ page }) => {
  await openWhiskerMenu(page);
  const passwordAttacks = page.getByTestId('category-password-attacks');
  await passwordAttacks.click();
  await expect(passwordAttacks).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('whisker-menu-dropdown')).toBeHidden();

  await page.getByRole('button', { name: 'Applications' }).click();
  await expect(page.getByTestId('whisker-menu-dropdown')).toBeVisible();
  await expect(passwordAttacks).toHaveAttribute('aria-selected', 'true');
});

test('persists the last selected category across page reloads', async ({ page }) => {
  await openWhiskerMenu(page);
  const recentCategory = page.getByTestId('category-recent');
  await recentCategory.click();
  await expect(recentCategory).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Escape');
  await page.reload();

  await page.getByRole('button', { name: 'Applications' }).click();
  await expect(page.getByTestId('whisker-menu-dropdown')).toBeVisible();
  await expect(recentCategory).toHaveAttribute('aria-selected', 'true');
});

test('home category surfaces pinned and recent sections', async ({ page }) => {
  const menu = await openWhiskerMenu(page);
  const homeCategory = page.getByTestId('category-home');
  await homeCategory.click();
  await expect(homeCategory).toHaveAttribute('aria-selected', 'true');

  await expect(menu.getByTestId('whisker-home-pinned')).toBeVisible();
  await expect(menu.getByTestId('whisker-home-recent-label')).toBeVisible();
});
