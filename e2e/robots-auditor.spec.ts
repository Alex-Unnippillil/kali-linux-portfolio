import { test, expect } from '@playwright/test';

test('Robots Auditor loads', async ({ page }) => {
  await page.goto('/apps/robots-auditor');
  await expect(page.getByRole('button', { name: 'Audit' })).toBeVisible();
});
