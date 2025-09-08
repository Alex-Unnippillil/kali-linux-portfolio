/** @jest-environment node */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

describe('keyboard navigation', () => {
  it('cycles focus without traps and passes axe rules', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const file = 'file://' + path.join(__dirname, 'fixtures', 'a11y-test.html');
    await page.goto(file);
    const active = new Set<string>();
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      active.add(await page.evaluate(() => document.activeElement?.id || ''));
    }
    expect(active.size).toBeGreaterThan(1);
    const results = await new AxeBuilder({ page })
      .withRules(['label', 'color-contrast', 'focus-order-semantics'])
      .analyze();
    expect(results.violations).toHaveLength(0);
    await browser.close();
  });
});
