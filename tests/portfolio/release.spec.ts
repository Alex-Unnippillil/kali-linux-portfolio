import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
const viewports = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }];
for (const viewport of viewports) {
  test(`overview fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?overview=1');
    await expect(page.getByRole('heading', { name: 'Alex Unnippillil', exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore the work' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir('portfolio-screenshots', { recursive: true });
    await page.screenshot({ path: `portfolio-screenshots/overview-${viewport.width}x${viewport.height}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
test('projects, provenance, search, and direct contact', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Featured', exact: true }).click();
  await expect(page.getByText('GPT Researcher · fork', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open source', exact: true }).click();
  await expect(page.getByText('GPT Researcher · fork', { exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('no-such-project');
  await expect(page.getByText('No matching projects')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await page.getByRole('link', { name: 'Web Crawler Studio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Architecture', exact: true })).toBeVisible();
  await page.screenshot({ path: 'portfolio-screenshots/project-detail.png', fullPage: true });
  await page.goto('/contact');
  await expect(page.getByRole('link', { name: 'Email Alex', exact: true })).toHaveAttribute('href', 'mailto:alex.unnippillil@hotmail.com');
});
test('non-JavaScript reading routes remain useful', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  for (const route of ['/', '/about', '/projects', '/projects/web-crawler', '/contact']) {
    const response = await page.goto(route); expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
  }
  await context.close();
});
test('keyboard skip link and public-route accessibility', async ({ page }) => {
  for (const route of ['/?overview=1', '/about', '/projects', '/contact']) {
    await page.goto(route);
    await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to application content' })).toBeFocused();
    await page.keyboard.press('Enter'); await expect(page.locator('#application-content')).toBeFocused();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});
test('desktop entry preference is explicit and reversible', async ({ page }) => {
  await page.goto('/?overview=1');
  await page.getByLabel('Remember desktop mode on this device').check();
  await page.getByRole('button', { name: 'Enter the desktop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Portfolio overview', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('kali-portfolio:entry'))).toBe('desktop');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Portfolio overview', exact: true })).toBeVisible();
  await page.screenshot({ path: 'portfolio-screenshots/desktop-entry.png', fullPage: true });
  await page.getByRole('button', { name: 'Portfolio overview', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Explore the work' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('kali-portfolio:entry'))).toBeNull();
});
test('reduced-motion overview and error route', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/?overview=1');
  await expect(page.getByRole('link', { name: 'Explore the work' })).toBeVisible();
  const response = await page.goto('/this-project-does-not-exist'); expect(response?.status()).toBe(404);
});
