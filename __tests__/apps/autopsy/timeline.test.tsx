import {
  createInitialTimelineState,
  timelineReducer,
  DEFAULT_MS_PER_PIXEL,
} from '../../../apps/autopsy/components/timelineState';

describe('timelineReducer', () => {
  const totalDurationMs = 120_000;

  it('sets active categories and resets offset', () => {
    const initial = {
      ...createInitialTimelineState(['docs']),
      offsetMs: 45_000,
      viewportWidth: 400,
      msPerPixel: 300,
      hasInteracted: true,
    };

    const next = timelineReducer(initial, {
      type: 'SET_ACTIVE_CATEGORIES',
      categoryIds: ['images', 'archives', 'images'],
      totalDurationMs,
    });

    expect(next.activeCategoryIds).toEqual(['images', 'archives']);
    expect(next.offsetMs).toBe(0);
    expect(next.hasInteracted).toBe(false);
  });

  it('pans and clamps within the total duration', () => {
    const base = {
      ...createInitialTimelineState(['docs']),
      viewportWidth: 400,
      msPerPixel: 150,
    };

    const panned = timelineReducer(base, {
      type: 'PAN',
      deltaMs: 30_000,
      totalDurationMs,
    });

    expect(panned.offsetMs).toBe(30_000);
    expect(panned.hasInteracted).toBe(true);

    const maxed = timelineReducer(panned, {
      type: 'PAN',
      deltaMs: 100_000,
      totalDurationMs,
    });

    expect(maxed.offsetMs).toBeCloseTo(60_000); // total - viewport (120k - 60k)

    const backToStart = timelineReducer(maxed, {
      type: 'PAN',
      deltaMs: -200_000,
      totalDurationMs,
    });

    expect(backToStart.offsetMs).toBe(0);
  });

  it('zooms around the provided focus point', () => {
    const state = {
      ...createInitialTimelineState(['docs']),
      viewportWidth: 800,
      msPerPixel: 200,
      offsetMs: 20_000,
    };

    const zoomed = timelineReducer(state, {
      type: 'ZOOM_BY_FACTOR',
      factor: 2,
      focusRatio: 0.5,
      totalDurationMs: 200_000,
    });

    expect(zoomed.msPerPixel).toBeCloseTo(100);
    expect(zoomed.offsetMs).toBeCloseTo(60_000);
    expect(zoomed.hasInteracted).toBe(true);
  });

  it('auto fits the timeline to the viewport when requested', () => {
    const state = {
      ...createInitialTimelineState(['docs']),
      viewportWidth: 400,
      msPerPixel: 500,
      offsetMs: 10_000,
    };

    const fitted = timelineReducer(state, {
      type: 'AUTO_FIT',
      totalDurationMs,
    });

    expect(fitted.msPerPixel).toBeCloseTo(300);
    expect(fitted.offsetMs).toBe(0);
    expect(fitted.hasInteracted).toBe(false);
  });

  it('resets to the default zoom level', () => {
    const state = {
      ...createInitialTimelineState(['docs']),
      msPerPixel: 500,
      offsetMs: 25_000,
      hasInteracted: true,
    };

    const reset = timelineReducer(state, {
      type: 'RESET',
      totalDurationMs,
    });

    expect(reset.msPerPixel).toBe(DEFAULT_MS_PER_PIXEL);
    expect(reset.offsetMs).toBe(0);
    expect(reset.hasInteracted).toBe(false);
  });
});
