import { test, expect } from '@playwright/test';

const APP_IDS = ['terminal', 'chrome', 'gedit', 'spotify', 'wireshark'] as const;

test.describe('Workspace profiles', () => {
  test('switching between profiles preserves app selections', async ({ page }) => {
    await page.goto('/apps/workspaces');
    await expect(page.getByTestId('workspace-manager')).toBeVisible();

    const toggle = (id: (typeof APP_IDS)[number]) => page.getByTestId(`app-toggle-${id}`);

    // Ensure default workspace is selected and mark five apps as active
    for (const id of APP_IDS) {
      await toggle(id).check();
      await expect(toggle(id)).toBeChecked();
    }

    await page.getByTestId('workspace-name-input').fill('Profile Bravo');
    await page.getByTestId('create-workspace').click();

    const bravoTab = page.locator('[data-testid^="workspace-tab-"]').filter({ hasText: 'Profile Bravo' });
    await expect(bravoTab).toBeVisible();
    await bravoTab.click();

    // Newly created profile should start empty
    for (const id of APP_IDS) {
      await expect(toggle(id)).not.toBeChecked();
      await toggle(id).check();
    }

    // Switch back to default profile and ensure previous selections persist
    const defaultTab = page.locator('[data-testid^="workspace-tab-"]').first();
    await defaultTab.click();
    for (const id of APP_IDS) {
      await expect(toggle(id)).toBeChecked();
    }

    // Reload to verify persistence across sessions
    await page.reload();
    await expect(defaultTab).toBeVisible();
    for (const id of APP_IDS) {
      await expect(toggle(id)).toBeChecked();
    }

    // Switch to the second profile and confirm its selections remained
    await bravoTab.click();
    for (const id of APP_IDS) {
      await expect(toggle(id)).toBeChecked();
    }
  });
});
