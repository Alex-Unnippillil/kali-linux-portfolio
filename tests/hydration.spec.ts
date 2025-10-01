import { test, expect } from '@playwright/test';

const routes = ['/', '/apps', '/apps/terminal', '/security-education'];

test.describe('hydration warnings', () => {
  for (const route of routes) {
    test(`no hydration warnings for ${route}`, async ({ page }) => {
      const consoleMessages: { type: string; text: string }[] = [];

      page.on('console', (message) => {
        const type = message.type();
        if (type === 'warning' || type === 'error') {
          consoleMessages.push({ type, text: message.text() });
        }
      });

      const response = await page.goto(route, { waitUntil: 'load' });
      expect(response?.ok()).toBeTruthy();

      const hydrationMessages = consoleMessages.filter(({ text }) =>
        /hydration/i.test(text) || /did not match/.test(text)
      );

      expect(
        hydrationMessages,
        `Expected no hydration warnings or errors, saw: ${hydrationMessages
          .map(({ type, text }) => `${type}: ${text}`)
          .join('\n')}`
      ).toHaveLength(0);
    });
  }
});
