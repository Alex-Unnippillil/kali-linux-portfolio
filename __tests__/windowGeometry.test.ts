import { sanitizeGeometry, buildWindowDefaults, SHRINK_RATIO } from '../utils/windowGeometry';

describe('window geometry sanitization', () => {
  it('centers and shrinks when the viewport contracts', () => {
    const originalViewport = { width: 1600, height: 900 };
    const defaults = buildWindowDefaults(originalViewport);
    const persisted = {
      x: 1200,
      y: 540,
      width: 960,
      height: 640,
      viewportWidth: originalViewport.width,
      viewportHeight: originalViewport.height,
    };

    const smallerViewport = { width: 800, height: 600 };
    const sanitized = sanitizeGeometry(persisted, smallerViewport, defaults);

    const widthPx = (sanitized.sizePercent.widthPercent / 100) * smallerViewport.width;
    const heightPx = (sanitized.sizePercent.heightPercent / 100) * smallerViewport.height;
    expect(widthPx).toBeCloseTo(smallerViewport.width * SHRINK_RATIO, 1);

    const expectedX = Math.min(
      Math.max((smallerViewport.width - widthPx) / 2, 0),
      Math.max(0, smallerViewport.width - widthPx),
    );
    const expectedY = Math.min(
      Math.max((smallerViewport.height - heightPx) / 2, 0),
      Math.max(0, smallerViewport.height - heightPx - 28),
    );

    expect(sanitized.position.x).toBeCloseTo(expectedX, 0);
    expect(sanitized.position.y).toBeCloseTo(expectedY, 0);
    expect(sanitized.shrinkApplied).toBe(true);

    expect(sanitized.position.x).toBeGreaterThanOrEqual(0);
    expect(sanitized.position.y).toBeGreaterThanOrEqual(0);
    expect(sanitized.position.x + widthPx).toBeLessThanOrEqual(smallerViewport.width + 0.5);
    expect(sanitized.position.y + heightPx).toBeLessThanOrEqual(smallerViewport.height + 0.5);
  });

  it('clamps oversized persisted coordinates into view', () => {
    const viewport = { width: 1280, height: 800 };
    const defaults = buildWindowDefaults(viewport);
    const persisted = {
      x: 1400,
      y: 900,
      width: 640,
      height: 520,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    };

    const sanitized = sanitizeGeometry(persisted, viewport, defaults);
    const widthPx = (sanitized.sizePercent.widthPercent / 100) * viewport.width;
    const heightPx = (sanitized.sizePercent.heightPercent / 100) * viewport.height;

    const maxX = Math.max(0, viewport.width - widthPx);
    const maxY = Math.max(0, viewport.height - heightPx - 28);

    expect(sanitized.position.x).toBeCloseTo(maxX, 0);
    expect(sanitized.position.y).toBeCloseTo(maxY, 0);
    expect(sanitized.shrinkApplied).toBe(false);

    expect(sanitized.position.x + widthPx).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(sanitized.position.y + heightPx).toBeLessThanOrEqual(viewport.height + 0.5);
  });
});

