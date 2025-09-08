/** @jest-environment node */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

describe('keyboard navigation', () => {
  it('cycles focus without traps and passes axe rules', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const file = 'file://' + path.join(__dirname, 'fixtures', 'a11y-test.html');
    await page.goto(file);
    let last = '';
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const current = await page.evaluate(
        () => document.activeElement?.id || '',
      );
      expect(current).not.toBe(last);
      last = current;
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22a', 'wcag22aa'])
      .withRules(['label', 'color-contrast', 'focus-order-semantics'])
      .analyze();
    expect(results.violations).toHaveLength(0);
    await context.close();
    await browser.close();
  });
});
