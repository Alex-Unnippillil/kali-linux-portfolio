import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('exports and restores panel profile', async ({ page }, testInfo) => {
  // Navigate to the plugin manager app via the apps list
  await page.goto('/apps');
  await page.locator('a[aria-label="Plugin Manager"]').click();
  await expect(page.getByRole('heading', { name: 'Plugin Catalog' })).toBeVisible();

  // Install the demo plugin and run it once
  const install = page.getByRole('button', { name: 'Install' });
  await install.click();
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.locator('text=Last Run: demo')).toBeVisible();

  // Save current plugin/profile config to a JSON file
  const profile = await page.evaluate(() => ({
    installedPlugins: localStorage.getItem('installedPlugins'),
    lastPluginRun: localStorage.getItem('lastPluginRun'),
  }));
  const profilePath = path.join(testInfo.outputDir, 'panel-profile.json');
  fs.writeFileSync(profilePath, JSON.stringify(profile), 'utf-8');

  // Clear existing state and verify plugin is gone
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Install' })).toBeVisible();
  await expect(page.locator('text=Last Run: demo')).toHaveCount(0);

  // Load the saved profile and reload
  const saved = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  await page.evaluate((data) => {
    localStorage.setItem('installedPlugins', data.installedPlugins);
    localStorage.setItem('lastPluginRun', data.lastPluginRun);
  }, saved);
  await page.reload();

  // Plugins and config should be restored
  await expect(page.getByRole('button', { name: 'Installed' })).toBeVisible();
  await expect(page.locator('text=Last Run: demo')).toBeVisible();
});

