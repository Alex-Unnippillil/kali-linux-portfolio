import { computeTiledLayout } from '../utils/windowLayout';

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const layoutToRect = (layout: { x: number; y: number; widthPercent: number; heightPercent: number }, viewportWidth: number, viewportHeight: number): Rect => {
  const width = (layout.widthPercent / 100) * viewportWidth;
  const height = (layout.heightPercent / 100) * viewportHeight;
  return {
    left: layout.x,
    top: layout.y,
    right: layout.x + width,
    bottom: layout.y + height,
  };
};

const overlaps = (a: Rect, b: Rect, epsilon = 0.5) => {
  const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const verticalOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return horizontalOverlap > epsilon && verticalOverlap > epsilon;
};

describe('computeTiledLayout', () => {
  it('returns an empty layout when there are no windows', () => {
    expect(computeTiledLayout(0, { viewportWidth: 1280, viewportHeight: 720, topOffset: 64 })).toEqual([]);
  });

  it('produces non-overlapping rectangles for five windows', () => {
    const viewportWidth = 1440;
    const viewportHeight = 900;
    const topOffset = 96;
    const bottomInset = 32;

    const layouts = computeTiledLayout(5, {
      viewportWidth,
      viewportHeight,
      topOffset,
      bottomInset,
      horizontalGap: 24,
      verticalGap: 24,
    });

    expect(layouts).toHaveLength(5);

    const rects = layouts.map((layout) => layoutToRect(layout, viewportWidth, viewportHeight));
    rects.forEach((rect) => {
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.top).toBeGreaterThanOrEqual(topOffset);
      expect(rect.right).toBeLessThanOrEqual(viewportWidth + 1);
      expect(rect.bottom).toBeLessThanOrEqual(viewportHeight + 1);
    });

    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it('scales across larger grids without overlap', () => {
    const viewportWidth = 1920;
    const viewportHeight = 1080;
    const topOffset = 88;

    const layouts = computeTiledLayout(10, {
      viewportWidth,
      viewportHeight,
      topOffset,
      horizontalGap: 16,
      verticalGap: 16,
    });

    expect(layouts).toHaveLength(10);

    const rects = layouts.map((layout) => layoutToRect(layout, viewportWidth, viewportHeight));
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
  });
});
