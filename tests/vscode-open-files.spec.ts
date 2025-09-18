import { test, expect } from '@playwright/test';

test('opens File Explorer at the VS Code workspace path', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#window-area')).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'vscode' }));
  });

  const vscodeWindow = page.locator('#vscode');
  await expect(vscodeWindow).toBeVisible();

  const folderSelect = vscodeWindow.locator('[data-testid="vscode-folder-select"]');
  await folderSelect.waitFor();
  await folderSelect.selectOption('workspace/data/vscode-example');

  const openButton = vscodeWindow.locator('[data-testid="open-in-files"]');
  await expect(openButton).toBeEnabled();
  await openButton.click();

  const filesWindow = page.locator('#files');
  await expect(filesWindow).toBeVisible();
  await expect(filesWindow).toHaveClass(/z-30/);

  const breadcrumb = filesWindow.locator('nav[aria-label="Breadcrumb"]');
  await expect(
    breadcrumb.locator('button', { hasText: 'vscode-example' })
  ).toBeVisible();
});
