import { expect, test, Locator } from '@playwright/test';

const getFocusStyles = async (locator: Locator) => {
  await locator.focus();
  return locator.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      boxShadow: styles.boxShadow,
      outlineStyle: styles.outlineStyle,
      outlineWidth: styles.outlineWidth,
    };
  });
};

test.describe('Focus visibility', () => {
  test('Applications toggle shows focus ring in default theme', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Applications' });
    const styles = await getFocusStyles(toggle);

    await expect(toggle).toBeFocused();
    expect(styles.boxShadow).not.toBe('none');
    expect(styles.boxShadow).toContain('rgb');
  });

  test('Applications toggle shows focus ring in dark theme', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.classList.add('dark');
    });

    const toggle = page.getByRole('button', { name: 'Applications' });
    const styles = await getFocusStyles(toggle);

    await expect(toggle).toBeFocused();
    expect(styles.boxShadow).not.toBe('none');
    expect(styles.boxShadow).toContain('rgb');
  });

  test('Category buttons retain focus visibility within the Whisker menu', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Applications' });
    await toggle.click();

    const firstCategory = page.locator('[role="listbox"] button').first();
    await firstCategory.waitFor({ state: 'visible' });
    const styles = await getFocusStyles(firstCategory);

    await expect(firstCategory).toBeFocused();
    expect(styles.boxShadow).not.toBe('none');
    expect(styles.boxShadow).toContain('rgb');
  });
});
