/** @jest-environment node */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

describe('window navigation', () => {
  it('opens and closes dialog without focus traps', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const file = 'file://' + path.join(__dirname, 'fixtures', 'a11y-window.html');
    await page.goto(file);
    await page.keyboard.press('Tab'); // focus open button
    await page.keyboard.press('Enter'); // open dialog
    const axe = await new AxeBuilder({ page })
      .withRules(['label', 'color-contrast', 'focus-order-semantics'])
      .analyze();
    expect(axe.violations).toHaveLength(0);
    const seen = new Set<string>();
    for (let i = 0; i < 2; i++) {
      seen.add(await page.evaluate(() => document.activeElement?.id || ''));
      await page.keyboard.press('Tab');
    }
    expect(seen.size).toBeGreaterThan(1);
    await page.keyboard.press('Enter'); // activate close button
    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe('open');
    await browser.close();
  });
});
