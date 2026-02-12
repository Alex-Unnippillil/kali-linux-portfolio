import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const RESOURCE_MONITOR_NAME = 'Resource Monitor';
const INPUT_LAB_NAME = 'Input Lab';

async function openApplicationsMenu(page: Page) {
  const menuButton = page.getByRole('button', { name: 'Applications' });
  await menuButton.waitFor({ state: 'visible' });
  await menuButton.click();
  return page.getByPlaceholder('Search');
}

test.describe('Task Manager stress handling', () => {
  test('warns on CPU spike and keeps input responsive', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      (window as any).__inputLatencySamples = [];
      const record = (event: Event) => {
        const delay = performance.now() - event.timeStamp;
        (window as any).__inputLatencySamples.push(delay);
      };
      window.addEventListener('pointerdown', record, true);
      window.addEventListener('keydown', record, true);
    });

    const searchInput = await openApplicationsMenu(page);
    await searchInput.fill(RESOURCE_MONITOR_NAME);
    const resourceTile = page.getByRole('button', { name: RESOURCE_MONITOR_NAME }).first();
    await resourceTile.waitFor({ state: 'visible' });
    await resourceTile.dblclick();

    const resourceWindow = page.getByRole('dialog', { name: RESOURCE_MONITOR_NAME });
    await expect(resourceWindow).toBeVisible();

    const stressButton = resourceWindow.getByRole('button', { name: 'Stress Test' });
    await stressButton.click();

    const stopStressButton = resourceWindow.getByRole('button', { name: 'Stop Stress' });
    await expect(stopStressButton).toBeVisible();

    await page.waitForFunction(() => {
      const host = document.querySelector('#resource-monitor');
      if (!host) return false;
      return host.querySelectorAll('.pointer-events-none').length >= 10;
    });

    const searchInputAgain = await openApplicationsMenu(page);
    await searchInputAgain.fill(INPUT_LAB_NAME);
    const inputLabTile = page.getByRole('button', { name: INPUT_LAB_NAME }).first();
    await inputLabTile.waitFor({ state: 'visible' });
    await inputLabTile.dblclick();

    const inputLabWindow = page.getByRole('dialog', { name: INPUT_LAB_NAME });
    await expect(inputLabWindow).toBeVisible();

    const inputField = inputLabWindow.locator('#input-lab-text');
    await inputField.fill('');
    await inputField.type('stress test still responsive');

    const statusRegion = inputLabWindow.getByRole('status');
    await expect(statusRegion).toContainText('Saved', { timeout: 3000 });

    const maxDelay = await page.evaluate(() => {
      const samples = (window as any).__inputLatencySamples || [];
      if (!samples.length) return 0;
      return Math.max(...samples);
    });
    expect(maxDelay).toBeLessThan(100);

    const taskbar = page.getByRole('toolbar');
    await taskbar.getByRole('button', { name: RESOURCE_MONITOR_NAME }).click();

    await stopStressButton.click();
    await expect(resourceWindow.getByRole('button', { name: 'Stress Test' })).toBeVisible();

    await page.waitForFunction(() => {
      const host = document.querySelector('#resource-monitor');
      if (!host) return false;
      return host.querySelectorAll('.pointer-events-none').length === 0;
    });
  });
});
