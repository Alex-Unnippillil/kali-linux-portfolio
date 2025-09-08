import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const scenarios = [
  { name: 'light theme', text: '#4b5563', background: '#F6F6F5' },
  { name: 'dark theme', text: '#9ca3af', background: '#1a1f26' },
];

for (const { name, text, background } of scenarios) {
  test(`button text has sufficient contrast in ${name}`, async ({ page }) => {
    await page.setContent(`<button style="color:${text};background:${background}">Sample</button>`);
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations).toEqual([]);
  });
}
