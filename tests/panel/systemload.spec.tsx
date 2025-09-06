import { test, expect } from '@playwright/test';

test.describe('System Load panel', () => {
  test('updates metrics and shows tooltip', async ({ page }) => {
    const responses = [
      { cpu: 5, ram: 10, swap: 15, uptime: 0 },
      { cpu: 23, ram: 41, swap: 7, uptime: 3730 },
    ];
    let callCount = 0;
    await page.route('**/api/systemload**', async (route) => {
      const body = responses[Math.min(callCount, responses.length - 1)];
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto('/panel/systemload');

    const cpuBar = page.getByTestId('cpu-bar');
    const ramBar = page.getByTestId('ram-bar');
    const swapBar = page.getByTestId('swap-bar');

    await expect(cpuBar).toHaveAttribute('aria-valuenow', '5');
    await expect(ramBar).toHaveAttribute('aria-valuenow', '10');
    await expect(swapBar).toHaveAttribute('aria-valuenow', '15');

    await page.waitForTimeout(1100);

    await expect(cpuBar).toHaveAttribute('aria-valuenow', '23');
    await expect(ramBar).toHaveAttribute('aria-valuenow', '41');
    await expect(swapBar).toHaveAttribute('aria-valuenow', '7');

    await cpuBar.hover();
    await expect(page.getByRole('tooltip')).toHaveText(
      'CPU: 23% • RAM: 41% • Uptime: 1:02:10'
    );
  });
});
