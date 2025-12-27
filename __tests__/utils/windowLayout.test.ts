import {
  clampWindowPositionWithinViewport,
  getSafeAreaInsets,
  measureSafeAreaInset,
} from '@/utils/windowLayout';
import { SNAP_BOTTOM_INSET } from '@/utils/uiConstants';

describe('getSafeAreaInsets', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument as Document;
    jest.restoreAllMocks();
  });

  it('returns zero insets when window or document are unavailable (SSR)', () => {
    globalThis.window = undefined as unknown as Window & typeof globalThis;
    globalThis.document = undefined as unknown as Document;

    expect(getSafeAreaInsets()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('parses safe-area CSS variables and ignores invalid values', () => {
    const getPropertyValue = jest.fn((property: string) => {
      switch (property) {
        case '--safe-area-top':
          return '12px';
        case '--safe-area-right':
          return ' 16 ';
        case '--safe-area-bottom':
          return '20px';
        case '--safe-area-left':
          return 'invalid';
        default:
          return '';
      }
    });

    const spy = jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue,
    } as unknown as CSSStyleDeclaration);

    const insets = getSafeAreaInsets();

    expect(spy).toHaveBeenCalledWith(document.documentElement);
    expect(insets).toEqual({ top: 12, right: 16, bottom: 20, left: 0 });
    expect(measureSafeAreaInset('bottom')).toBe(20);
    expect(measureSafeAreaInset('left')).toBe(0);
  });
});

describe('clampWindowPositionWithinViewport', () => {
  const topOffset = 96;

  it('returns null when the position is not an object', () => {
    expect(clampWindowPositionWithinViewport(null as any, { width: 200, height: 150 })).toBeNull();
    expect(clampWindowPositionWithinViewport(undefined as any, { width: 200, height: 150 })).toBeNull();
  });

  it('clamps coordinates within a wide viewport and reports bounds', () => {
    const result = clampWindowPositionWithinViewport(
      { x: 1600, y: 1400 },
      { width: 400, height: 300 },
      {
        viewportWidth: 1920,
        viewportHeight: 1080,
        topOffset,
        bottomInset: 24,
      },
    );

    const expectedMaxX = 1920 - 400;
    const availableVertical = 1080 - topOffset - SNAP_BOTTOM_INSET - 24;
    const expectedMaxY = topOffset + Math.max(availableVertical - 300, 0);

    expect(result).toEqual({
      x: expectedMaxX,
      y: expectedMaxY,
      bounds: {
        minX: 0,
        maxX: expectedMaxX,
        minY: topOffset,
        maxY: expectedMaxY,
      },
    });
  });

  it('respects tall viewports by clamping vertically with safe-area inset', () => {
    const result = clampWindowPositionWithinViewport(
      { x: -200, y: 2000 },
      { width: 500, height: 700 },
      {
        viewportWidth: 900,
        viewportHeight: 1600,
        topOffset,
        bottomInset: 48,
      },
    );

    const horizontalSpace = Math.max(900 - 500, 0);
    const availableVertical = Math.max(1600 - topOffset - SNAP_BOTTOM_INSET - 48, 0);
    const verticalSpace = Math.max(availableVertical - 700, 0);

    expect(result).toEqual({
      x: 0,
      y: topOffset + verticalSpace,
      bounds: {
        minX: 0,
        maxX: horizontalSpace,
        minY: topOffset,
        maxY: topOffset + verticalSpace,
      },
    });
  });

  it('falls back to safe defaults when viewport dimensions are zero', () => {
    const result = clampWindowPositionWithinViewport(
      { x: 50, y: 10 },
      { width: 200, height: 100 },
      {
        viewportWidth: 0,
        viewportHeight: 0,
        topOffset,
      },
    );

    expect(result).toEqual({
      x: 50,
      y: topOffset,
      bounds: {
        minX: 0,
        maxX: 0,
        minY: topOffset,
        maxY: topOffset,
      },
    });
  });

  it('handles invalid numeric inputs by clamping to safe ranges', () => {
    const result = clampWindowPositionWithinViewport(
      { x: Number.NaN, y: Number.NEGATIVE_INFINITY },
      { width: -300, height: Number.NaN },
      {
        viewportWidth: 1280,
        viewportHeight: 720,
        topOffset,
        bottomInset: 0,
      },
    );

    const expectedMaxX = 1280;
    const availableVertical = Math.max(720 - topOffset - SNAP_BOTTOM_INSET, 0);
    const expectedMaxY = topOffset + Math.max(availableVertical, 0);

    expect(result).toEqual({
      x: 0,
      y: topOffset,
      bounds: {
        minX: 0,
        maxX: expectedMaxX,
        minY: topOffset,
        maxY: expectedMaxY,
      },
    });
  });
});
