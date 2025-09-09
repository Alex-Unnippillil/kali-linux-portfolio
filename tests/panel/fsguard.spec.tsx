import { test, expect } from '@playwright/test';

// Simulates the xfce4-fsguard panel plugin behaviour in a minimal DOM.
// The test verifies icon colour changes, tooltip contents, and click handling.

test('FsGuard reacts to Warning and Urgent thresholds', async ({ page }) => {
  let openedPath: string | undefined;
  await page.exposeFunction('openPath', (path: string) => {
    openedPath = path;
  });

  await page.setContent(`
    <div id="fsguard" data-path="/tmp">
      <svg id="icon"></svg>
      <span id="tooltip"></span>
    </div>
    <script>
      const warning = 100;
      const urgent = 50;
      function updateFsGuard(free) {
        const icon = document.getElementById('icon');
        const tip = document.getElementById('tooltip');
        icon.dataset.state = free < urgent ? 'urgent' : free < warning ? 'warning' : 'ok';
        tip.textContent = free + ' MB free';
      }
      document.getElementById('fsguard').addEventListener('click', () =>
        window.openPath(document.getElementById('fsguard').dataset.path)
      );
    </script>
  `);

  // Cross into warning threshold
    await page.evaluate(() => (window as any).updateFsGuard(80));
  await expect(page.locator('#icon')).toHaveAttribute('data-state', 'warning');
  await expect(page.locator('#tooltip')).toHaveText('80 MB free');

  // Cross into urgent threshold
    await page.evaluate(() => (window as any).updateFsGuard(20));
  await expect(page.locator('#icon')).toHaveAttribute('data-state', 'urgent');
  await expect(page.locator('#tooltip')).toHaveText('20 MB free');

  // Clicking opens configured path
  await page.locator('#fsguard').click();
  expect(openedPath).toBe('/tmp');
});
