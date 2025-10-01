import { applyOverscrollCushion, normalizeWheelDelta } from '../utils/scroll';

describe('normalizeWheelDelta', () => {
  it('returns pixel deltas for DOM_DELTA_PIXEL events', () => {
    expect(normalizeWheelDelta({ deltaX: 5, deltaY: -10, deltaMode: 0 })).toEqual({ x: 5, y: -10 });
  });

  it('converts line-based delta values to pixels', () => {
    expect(normalizeWheelDelta({ deltaX: 2, deltaY: -3, deltaMode: 1 })).toEqual({ x: 32, y: -48 });
  });

  it('converts page-based delta values to pixels', () => {
    expect(normalizeWheelDelta({ deltaX: 1, deltaY: 1, deltaMode: 2 })).toEqual({ x: 800, y: 800 });
  });
});

describe('applyOverscrollCushion', () => {
  const basePosition = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 100,
    scrollWidth: 100,
    clientHeight: 50,
    clientWidth: 50,
  };

  it('applies full delta when scrolling within bounds', () => {
    const delta = applyOverscrollCushion({
      position: { ...basePosition, scrollTop: 20 },
      delta: 40,
      overscrollCushion: 0.25,
      reduceMotion: false,
      axis: 'y',
    });

    expect(delta).toBe(40);
  });

  it('damps delta when overscrolling at start or end', () => {
    const delta = applyOverscrollCushion({
      position: basePosition,
      delta: -40,
      overscrollCushion: 0.25,
      reduceMotion: false,
      axis: 'y',
    });

    expect(delta).toBeCloseTo(-10);
  });

  it('respects reduce motion preference by skipping cushioning', () => {
    const delta = applyOverscrollCushion({
      position: basePosition,
      delta: -40,
      overscrollCushion: 0.25,
      reduceMotion: true,
      axis: 'y',
    });

    expect(delta).toBe(-40);
  });

  it('handles horizontal overscroll damping', () => {
    const delta = applyOverscrollCushion({
      position: { ...basePosition, scrollLeft: 50 },
      delta: 20,
      overscrollCushion: 0.2,
      reduceMotion: false,
      axis: 'x',
    });

    expect(delta).toBeCloseTo(4);
  });
});
