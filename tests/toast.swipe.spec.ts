import { expect, test } from '@playwright/test';

test.describe('Toast interactions', () => {
  test('allows dismissing a toast with a swipe gesture', async ({ page }) => {
    page.on('console', (message) => {
      console.log(`BROWSER LOG [${message.type()}]: ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      console.log(`BROWSER ERROR: ${error}`);
    });
    await page.route('**/*', async (route) => {
      if (!route.request().url().startsWith('http://localhost:3000')) {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const headers = { ...response.headers() };
      if ('content-security-policy' in headers) {
        delete headers['content-security-policy'];
      }
      await route.fulfill({
        response,
        headers,
        body: await response.body(),
      });
    });
    await page.goto('/ui/notifications-test');
    await page.waitForFunction(() =>
      (window as typeof window & { __notificationsTestReady?: boolean })
        .__notificationsTestReady === true,
    );
    const trigger = page.getByTestId('spawn-toast');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const toast = page.getByRole('status').first();
    await expect(toast).toBeVisible();

    const box = await toast.boundingBox();
    if (!box) {
      throw new Error('Toast did not render as expected');
    }

    const centerY = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    await page.mouse.move(startX, centerY);
    await page.mouse.down();
    await page.mouse.move(startX + box.width + 120, centerY, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toBeHidden();
  });
});
