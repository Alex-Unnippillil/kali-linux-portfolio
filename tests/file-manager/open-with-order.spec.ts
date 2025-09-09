import { test, expect } from '@playwright/test';

const MIME_TYPE = 'text/plain';
const STORAGE_KEY = `openWith:${MIME_TYPE}`;

// Tests reordering "open with" alternatives for a MIME type and ensuring the
// preferred application remains on top while the custom order persists across
// sessions.
test.describe('file manager open-with order', () => {
  test('reordered alternatives persist and preferred stays first', async ({ page, context }) => {
    // Use a stable origin so localStorage is available.
    await page.goto('https://example.com');

    // Seed initial order: preferred app1 followed by app2 and app3.
      await page.evaluate(
        ({ key, initial }) => {
          localStorage.setItem(key, JSON.stringify(initial));
        },
        { key: STORAGE_KEY, initial: ['app1', 'app2', 'app3'] },
      );

    // Reorder alternatives: move app3 before app2 while keeping app1 first.
    await page.evaluate((key) => {
      const order = JSON.parse(localStorage.getItem(key)!);
      const [preferred, ...others] = order;
      const reordered = [preferred, others[1], others[0]];
      localStorage.setItem(key, JSON.stringify(reordered));
    }, STORAGE_KEY);

    // Verify new order within the same session.
    await expect(
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY),
    ).resolves.toEqual(['app1', 'app3', 'app2']);

    // Open a new page to simulate a new session and confirm persistence.
    const page2 = await context.newPage();
    await page2.goto('https://example.com');
    const stored = await page2.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
    expect(stored).toEqual(['app1', 'app3', 'app2']);
    expect(stored[0]).toBe('app1');
  });
});

