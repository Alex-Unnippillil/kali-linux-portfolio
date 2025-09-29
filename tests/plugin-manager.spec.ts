import { test, expect, Page } from '@playwright/test';
import path from 'path';

async function getInstalledOrder(page: Page): Promise<string[]> {
  const ids = await page
    .locator('[data-testid^="installed-plugin-"]')
    .evaluateAll((items) => items.map((item) => item.getAttribute('data-plugin-id')));

  return ids.filter((id): id is string => Boolean(id));
}

test('reorders and toggles persist across reloads and sessions', async ({ page }, testInfo) => {
  await page.goto('/apps/plugin-manager');
  await page.evaluate(() => {
    localStorage.removeItem('pluginManagerConfig');
    localStorage.removeItem('installedPlugins');
    localStorage.removeItem('lastPluginRun');
  });
  await page.reload();

  const installButtons = page.locator('[data-testid^="install-"]');
  const availableIds = await installButtons.evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute('data-plugin-id'))
      .filter((id): id is string => Boolean(id))
  );

  expect(availableIds.length).toBeGreaterThanOrEqual(2);
  const [firstInstall, secondInstall] = availableIds.slice(0, 2);

  for (const pluginId of [firstInstall, secondInstall]) {
    const installButton = page.getByTestId(`install-${pluginId}`);
    if (!(await installButton.isDisabled())) {
      await installButton.click();
    }
    await expect(installButton).toBeDisabled();
  }

  const initialOrder = await getInstalledOrder(page);
  expect(initialOrder).toEqual([firstInstall, secondInstall]);

  await page.dragAndDrop(
    `[data-testid="installed-plugin-${secondInstall}"]`,
    `[data-testid="installed-plugin-${firstInstall}"]`
  );

  await expect.poll(() => getInstalledOrder(page)).toEqual([secondInstall, firstInstall]);

  const orderAfterReorder = await getInstalledOrder(page);
  const [disabledTarget] = orderAfterReorder;

  await page.getByTestId(`toggle-${disabledTarget}`).click();
  await expect(page.getByTestId(`toggle-${disabledTarget}`)).not.toBeChecked();
  await expect(page.getByTestId(`installed-run-${disabledTarget}`)).toBeDisabled();
  await expect(page.getByTestId(`run-${disabledTarget}`)).toBeDisabled();

  await page.reload();

  await expect.poll(() => getInstalledOrder(page)).toEqual(orderAfterReorder);
  await expect(page.getByTestId(`toggle-${disabledTarget}`)).not.toBeChecked();
  await expect(page.getByTestId(`installed-run-${disabledTarget}`)).toBeDisabled();

  const storagePath = path.join(testInfo.outputPath(), 'plugin-manager-state.json');
  await page.context().storageState({ path: storagePath });

  const browser = page.context().browser();
  if (!browser) {
    throw new Error('Browser instance not available');
  }

  const baseURL = testInfo.project.use.baseURL as string | undefined;
  const newContext = await browser.newContext({
    storageState: storagePath,
    baseURL,
  });

  const newPage = await newContext.newPage();
  await newPage.goto('/apps/plugin-manager');

  await expect.poll(() => getInstalledOrder(newPage)).toEqual(orderAfterReorder);
  await expect(newPage.getByTestId(`toggle-${disabledTarget}`)).not.toBeChecked();
  await expect(newPage.getByTestId(`installed-run-${disabledTarget}`)).toBeDisabled();

  await newContext.close();
});
