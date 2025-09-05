import { test, expect } from '@playwright/test';

// Helper to read key CSS variables from the document root
async function getVars(page: import('@playwright/test').Page) {
  return await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      highlight: style.getPropertyValue('--highlight').trim(),
      selection: style.getPropertyValue('--selection').trim(),
      emblem: style.getPropertyValue('--emblem').trim(),
    };
  });
}

test('theme hooks update CSS variables', async ({ page }) => {
  await page.goto('/apps/file-explorer');

  // start from default theme
  await page.evaluate(() => {
    localStorage.setItem('app:theme', 'default');
    document.documentElement.dataset.theme = 'default';
    document.documentElement.classList.remove('dark');
  });

  const initial = await getVars(page);

  // switch to dark theme
  await page.evaluate(() => {
    localStorage.setItem('app:theme', 'dark');
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.classList.add('dark');
  });

  const updated = await getVars(page);

  expect(updated.highlight).not.toBe(initial.highlight);
  expect(updated.selection).not.toBe(initial.selection);
  expect(updated.emblem).not.toBe(initial.emblem);
});

