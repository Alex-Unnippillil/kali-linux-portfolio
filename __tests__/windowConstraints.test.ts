import {
  clampPercentFromPx,
  detectContentType,
  enforceSizeConstraints,
  getConstraintPreset,
  getMinDimensions,
  resolveConstraints,
} from '../utils/windowConstraints';

describe('windowConstraints helpers', () => {
  test('detectContentType identifies forms', () => {
    const container = document.createElement('div');
    container.className = 'windowMainScreen';
    container.appendChild(document.createElement('form'));
    expect(detectContentType(container)).toBe('form');
  });

  test('detectContentType identifies media content', () => {
    const container = document.createElement('div');
    container.className = 'windowMainScreen';
    container.appendChild(document.createElement('canvas'));
    expect(detectContentType(container)).toBe('media');
  });

  test('detectContentType identifies list-like layouts', () => {
    const container = document.createElement('div');
    container.className = 'windowMainScreen';
    container.appendChild(document.createElement('ul'));
    expect(detectContentType(container)).toBe('list');
  });

  test('resolveConstraints respects dataset overrides', () => {
    const container = document.createElement('div');
    container.className = 'windowMainScreen';
    container.dataset.windowContent = 'media';
    container.dataset.windowMinWidth = '640';
    container.dataset.windowMinHeight = '360';
    const resolved = resolveConstraints(container);
    expect(resolved.type).toBe('media');
    expect(resolved.minWidthPx).toBe(640);
    expect(resolved.minHeightPx).toBe(360);
  });

  test('clampPercentFromPx clamps to viewport size', () => {
    expect(clampPercentFromPx(500, 1000)).toBeCloseTo(50);
    expect(clampPercentFromPx(1500, 1000)).toBe(100);
    expect(clampPercentFromPx(-200, 1000)).toBe(0);
  });

  test('enforceSizeConstraints applies min dimensions', () => {
    const constraints = getConstraintPreset('form');
    const enforced = enforceSizeConstraints(10, 10, 1000, 800, constraints);
    const { minWidthPx, minHeightPx } = getMinDimensions(constraints);
    expect(enforced.widthPercent).toBeCloseTo((minWidthPx / 1000) * 100);
    expect(enforced.heightPercent).toBeCloseTo((minHeightPx / 800) * 100);
  });
});
