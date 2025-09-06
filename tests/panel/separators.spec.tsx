import { test, expect } from '@playwright/test';

// This test ensures dragging a separator with the "Expand" option
// pushes adjacent panels to the container edges while in Edit Mode.

const PANEL_ROUTE = '/panel';

function closeEnough(a: number | undefined, b: number | undefined, tol = 1) {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  return Math.abs(a - b) <= tol;
}

test.describe('Panel separators', () => {
  test('Expand pushes neighbors to panel edges', async ({ page }) => {
    await page.goto(PANEL_ROUTE);

    // Enter Edit Mode
    await page.getByRole('button', { name: /edit mode/i }).click();

    // Drag the first separator and choose the Expand option
    const separator = page.getByRole('separator').first();
    await separator.click({ button: 'right' });
    await page.getByRole('menuitem', { name: /expand/i }).click();

    const group = page.locator('[data-testid="panel-group"]');
    const first = group.locator('[data-testid="panel"]').first();
    const last = group.locator('[data-testid="panel"]').last();

    const groupBox = await group.boundingBox();
    const firstBox = await first.boundingBox();
    const lastBox = await last.boundingBox();

    // Verify the first panel aligns with the left edge
    expect(closeEnough(firstBox?.x, groupBox?.x)).toBeTruthy();

    // Verify the last panel aligns with the right edge
    const lastRight = (lastBox?.x ?? 0) + (lastBox?.width ?? 0);
    const groupRight = (groupBox?.x ?? 0) + (groupBox?.width ?? 0);
    expect(closeEnough(lastRight, groupRight)).toBeTruthy();
  });
});
