import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const urls = ['/', '/apps'];
for (const path of urls) {
    test(`no accessibility violations on ${path}`, async ({ page }) => {
        await page.goto(`http://localhost:3000${path}`);
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}
