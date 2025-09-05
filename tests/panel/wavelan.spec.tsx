import { test, expect } from '@playwright/test';

// Simulate fluctuating RSSI and SSID, ensure bars animate and tooltip shows percent.
// Clicking the widget should navigate to the network editor.

test.describe('wavelan panel plugin', () => {
  test('updates signal bars and opens editor', async ({ page }) => {
    // Navigate to the panel page that contains the wavelan widget
    await page.goto('/panel');

    const widget = page.locator('[data-testid="panel-wavelan"]');

    // Simulate network changes
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('wavelan-update', { detail: { rssi: -30, ssid: 'CafeWifi' } })
      );
    });

    // Verify tooltip shows signal percentage
    await widget.hover();
    await expect(page.locator('[role="tooltip"]')).toContainText('93%');

    // Update with weaker signal to trigger animation
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('wavelan-update', { detail: { rssi: -75, ssid: 'CafeWifi' } })
      );
    });

    const bars = widget.locator('[data-testid="signal-bar"]');
    await expect(bars.first()).toBeVisible();

    // Clicking the widget should open the network editor
    await widget.click();
    await expect(page).toHaveURL(/network-editor/);
  });
});

