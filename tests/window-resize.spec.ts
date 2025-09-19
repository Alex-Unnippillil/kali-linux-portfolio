import { test, expect, type BoundingBox } from '@playwright/test';

const tolerance = 4;

type ResizeAssertion = (before: BoundingBox, after: BoundingBox) => void;

type HandleConfig = {
  name: string;
  delta: { x: number; y: number };
  cursor: string;
  assert: ResizeAssertion;
};

function assertBoundingBox(box: BoundingBox | null): asserts box is BoundingBox {
  expect(box).not.toBeNull();
}

const handles: HandleConfig[] = [
  {
    name: 'right',
    delta: { x: 160, y: 0 },
    cursor: 'cursor-ew-resize',
    assert: (before, after) => {
      expect(after.width).toBeGreaterThan(before.width);
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(tolerance);
    },
  },
  {
    name: 'left',
    delta: { x: 120, y: 0 },
    cursor: 'cursor-ew-resize',
    assert: (before, after) => {
      expect(after.width).toBeLessThan(before.width);
      expect(after.x).toBeGreaterThan(before.x);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(tolerance);
    },
  },
  {
    name: 'bottom',
    delta: { x: 0, y: 140 },
    cursor: 'cursor-ns-resize',
    assert: (before, after) => {
      expect(after.height).toBeGreaterThan(before.height);
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(tolerance);
    },
  },
  {
    name: 'top',
    delta: { x: 0, y: 120 },
    cursor: 'cursor-ns-resize',
    assert: (before, after) => {
      expect(after.height).toBeLessThan(before.height);
      expect(after.y).toBeGreaterThan(before.y);
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(tolerance);
    },
  },
  {
    name: 'top-left',
    delta: { x: 120, y: 100 },
    cursor: 'cursor-nwse-resize',
    assert: (before, after) => {
      expect(after.width).toBeLessThan(before.width);
      expect(after.height).toBeLessThan(before.height);
      expect(after.x).toBeGreaterThan(before.x);
      expect(after.y).toBeGreaterThan(before.y);
    },
  },
  {
    name: 'top-right',
    delta: { x: 150, y: 110 },
    cursor: 'cursor-nesw-resize',
    assert: (before, after) => {
      expect(after.width).toBeGreaterThan(before.width);
      expect(after.height).toBeLessThan(before.height);
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(tolerance);
      expect(after.y).toBeGreaterThan(before.y);
    },
  },
  {
    name: 'bottom-left',
    delta: { x: 120, y: 140 },
    cursor: 'cursor-nesw-resize',
    assert: (before, after) => {
      expect(after.width).toBeLessThan(before.width);
      expect(after.height).toBeGreaterThan(before.height);
      expect(after.x).toBeGreaterThan(before.x);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(tolerance);
    },
  },
  {
    name: 'bottom-right',
    delta: { x: 150, y: 140 },
    cursor: 'cursor-nwse-resize',
    assert: (before, after) => {
      expect(after.width).toBeGreaterThan(before.width);
      expect(after.height).toBeGreaterThan(before.height);
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(tolerance);
    },
  },
];

test.describe('desktop window resize handles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#about-alex', { state: 'visible' });
  });

  for (const handle of handles) {
    test(`resizes via ${handle.name} handle`, async ({ page }) => {
      const windowLocator = page.locator('#about-alex');
      const ghost = page.locator('[data-testid="window-resize-ghost"]');
      const handleLocator = windowLocator.locator(`[data-testid="resize-handle-${handle.name}"]`);

      const initialBox = await windowLocator.boundingBox();
      assertBoundingBox(initialBox);

      const handleBox = await handleLocator.boundingBox();
      assertBoundingBox(handleBox);

      const startX = handleBox.x + handleBox.width / 2;
      const startY = handleBox.y + handleBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();

      try {
        await page.mouse.move(startX + handle.delta.x, startY + handle.delta.y, { steps: 10 });
        await expect(ghost).toBeVisible();
        await expect(windowLocator).toHaveClass(new RegExp(handle.cursor));

        await expect.poll(async () => {
          const ghostBox = await ghost.boundingBox();
          const liveBox = await windowLocator.boundingBox();
          if (!ghostBox || !liveBox) {
            return Number.POSITIVE_INFINITY;
          }
          return Math.max(
            Math.abs(ghostBox.x - liveBox.x),
            Math.abs(ghostBox.y - liveBox.y),
            Math.abs(ghostBox.width - liveBox.width),
            Math.abs(ghostBox.height - liveBox.height),
          );
        }).toBeLessThanOrEqual(3);
      } finally {
        await page.mouse.up();
      }

      await expect(ghost).toBeHidden();
      await expect(windowLocator).toHaveClass(/cursor-default/);

      const finalBox = await windowLocator.boundingBox();
      assertBoundingBox(finalBox);

      handle.assert(initialBox, finalBox);
    });
  }
});
