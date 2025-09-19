import { test, expect } from '@playwright/test';

test.describe('desktop grid alignment', () => {
  test('icons snap to grid and persist between renders', async ({ page }) => {
    await page.goto('/');
    const layer = page.locator('[data-desktop-icon-layer]');
    await layer.waitFor();

    const icon = page.locator('[data-desktop-icon="about-alex"]');
    await expect(icon).toBeVisible();

    const metrics = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const cellWidth = parseFloat(style.getPropertyValue('--desktop-grid-cell-width'));
      const cellHeight = parseFloat(style.getPropertyValue('--desktop-grid-cell-height'));
      return { cellWidth, cellHeight };
    });

    const parseAttr = async (attr: string) =>
      parseInt((await icon.getAttribute(attr)) ?? '0', 10);

    const initialRow = await parseAttr('data-grid-row');
    const initialCol = await parseAttr('data-grid-col');

    const iconBox = await icon.boundingBox();
    const layerBox = await layer.boundingBox();
    if (!iconBox || !layerBox) {
      throw new Error('Failed to measure desktop icon');
    }

    const centerX = iconBox.x + iconBox.width / 2;
    const centerY = iconBox.y + iconBox.height / 2;
    const maxRight = layerBox.x + layerBox.width - metrics.cellWidth * 0.5;
    const minLeft = layerBox.x + metrics.cellWidth * 0.5;
    let targetX = centerX + metrics.cellWidth * 1.5;
    if (targetX > maxRight) {
      targetX = centerX - metrics.cellWidth * 1.5;
    }
    if (targetX < minLeft) {
      targetX = Math.min(maxRight, centerX + metrics.cellWidth);
    }
    const maxBottom = layerBox.y + layerBox.height - metrics.cellHeight * 0.5;
    const minTop = layerBox.y + metrics.cellHeight * 0.5;
    let targetY = centerY + metrics.cellHeight;
    if (targetY > maxBottom) {
      targetY = centerY - metrics.cellHeight;
    }
    if (targetY < minTop) {
      targetY = Math.min(maxBottom, centerY + metrics.cellHeight * 0.75);
    }

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.mouse.up();

    await expect
      .poll(async () => ({ col: await parseAttr('data-grid-col'), row: await parseAttr('data-grid-row') }))
      .toSatisfy(({ col, row }) => col !== initialCol || row !== initialRow);

    const draggedRow = await parseAttr('data-grid-row');
    const draggedCol = await parseAttr('data-grid-col');
    const draggedBox = await icon.boundingBox();
    const freshLayerBox = await layer.boundingBox();
    if (!draggedBox || !freshLayerBox) {
      throw new Error('Failed to measure dragged icon');
    }
    const relDragX = draggedBox.x - freshLayerBox.x;
    const relDragY = draggedBox.y - freshLayerBox.y;
    expect(Math.abs(relDragX - draggedCol * metrics.cellWidth)).toBeLessThan(2);
    expect(Math.abs(relDragY - draggedRow * metrics.cellHeight)).toBeLessThan(2);

    await page.locator('#app-about-alex').focus();
    await page.keyboard.press('ArrowRight');
    await expect(icon).toHaveAttribute('data-grid-col', String(draggedCol + 1));
    await page.keyboard.press('Shift+ArrowDown');
    await expect(icon).toHaveAttribute('data-grid-row', String(draggedRow + 5));

    const keyedRow = await parseAttr('data-grid-row');
    const keyedCol = await parseAttr('data-grid-col');
    const keyedBox = await icon.boundingBox();
    const keyedLayerBox = await layer.boundingBox();
    if (!keyedBox || !keyedLayerBox) {
      throw new Error('Failed to measure keyboard-adjusted icon');
    }
    const relKeyX = keyedBox.x - keyedLayerBox.x;
    const relKeyY = keyedBox.y - keyedLayerBox.y;
    expect(Math.abs(relKeyX - keyedCol * metrics.cellWidth)).toBeLessThan(2);
    expect(Math.abs(relKeyY - keyedRow * metrics.cellHeight)).toBeLessThan(2);

    await page.reload();
    await layer.waitFor();
    const iconAfterReload = page.locator('[data-desktop-icon="about-alex"]');
    await expect(iconAfterReload).toHaveAttribute('data-grid-col', String(keyedCol));
    await expect(iconAfterReload).toHaveAttribute('data-grid-row', String(keyedRow));
  });
});
