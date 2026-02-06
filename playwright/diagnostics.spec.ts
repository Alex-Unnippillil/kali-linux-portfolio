import { test, expect } from '@playwright/test';

test('diagnostics app runs without unhandled rejections', async ({ page, context }) => {
  const pageErrors: Error[] = [];

  await context.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch {
      // ignore storage access issues during setup
    }
  });

  page.on('pageerror', (error) => {
    if (error.message?.includes('Failed to update a ServiceWorker')) {
      return;
    }

    pageErrors.push(error);
  });

  await page.goto('/apps');

  const diagnosticsLink = page.getByRole('link', { name: 'Plugin Manager' });
  await expect(diagnosticsLink).toBeVisible();
  await diagnosticsLink.click();

  await expect(page).toHaveURL(/\/apps\/plugin-manager$/);
  await expect(page.getByRole('heading', { name: 'Plugin Catalog' })).toBeVisible();

  const pluginRows = page.locator('ul li');
  await expect(pluginRows.first()).toBeVisible();
  const pluginCount = await pluginRows.count();
  expect(pluginCount).toBeGreaterThan(0);

  let lastPluginId = '';

  for (let index = 0; index < pluginCount; index += 1) {
    const row = pluginRows.nth(index);
    const pluginId = (await row.locator('span').first().textContent())?.trim() || '';
    expect(pluginId).not.toEqual('');
    lastPluginId = pluginId;

    const installButton = row.getByRole('button', { name: 'Install' });
    if (await installButton.isVisible()) {
      await installButton.click();
      await expect(row.getByRole('button', { name: 'Installed' })).toBeVisible();
    }

    const runButton = row.getByRole('button', { name: 'Run' });
    await expect(runButton).toBeVisible();
    await runButton.click();

    await expect(
      page.getByRole('heading', { level: 2, name: new RegExp(`Last Run: ${pluginId}`) }),
    ).toBeVisible();

    const output = page.locator('pre').first();
    await expect(output).toBeVisible();
    await expect(output).toContainText(/\S/);
  }

  const exportButton = page.getByRole('button', { name: 'Export CSV' });
  await expect(exportButton).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  if (lastPluginId) {
    expect(download.suggestedFilename()).toBe(`${lastPluginId}.csv`);
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/apps$/);
  await page.getByRole('link', { name: 'Plugin Manager' }).click();

  await expect(page).toHaveURL(/\/apps\/plugin-manager$/);
  await expect(page.getByRole('button', { name: 'Installed' })).toHaveCount(pluginCount);
  if (lastPluginId) {
    await expect(
      page.getByRole('heading', { level: 2, name: new RegExp(`Last Run: ${lastPluginId}`) }),
    ).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});
