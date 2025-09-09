import { test, expect } from '@playwright/test';

// The tools page exposes category filters with counts. This test
// exercises the Information Gathering filter to ensure the count
// matches the number of cards rendered in the grid after applying
// the filter.
test('filters tools grid by Information Gathering category', async ({ page }) => {
  // Navigate to the tools catalogue page.
  await page.goto('/tools');

  // Locate the Information Gathering filter and grab the count displayed
  // next to the label, e.g. "Information Gathering (12)".
  const filter = page.getByText('Information Gathering', { exact: false }).first();
  const labelText = await filter.textContent();
  expect(labelText).toBeTruthy();
  const match = labelText!.match(/\((\d+)\)/);
  expect(match).not.toBeNull();
    const expectedCount = parseInt(match![1]!, 10);
  expect(expectedCount).toBeGreaterThan(0);

  // Apply the filter.
  await filter.click();

  // The tools are displayed in a grid. Each entry is rendered as a link
  // inside a container with id "tools-grid" (or "tool-grid" on some builds).
  const grid = page.locator('#tools-grid, #tool-grid');
  await expect(grid).toBeVisible();

  // Count the number of tool cards and compare with the filter count.
  const cards = grid.locator('a');
  await expect(cards).toHaveCount(expectedCount);
});
