import { saveWindowGeometry, restoreWindowGeometry, removeWindowGeometry, clearAllWindowGeometry } from '@/src/wm/persistence';

const viewport = { width: 1200, height: 800 } as const;

describe('window geometry persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and restores geometry per application', () => {
    saveWindowGeometry(
      'app-1',
      { x: 160, y: 120, widthPct: 60, heightPct: 70 },
      viewport,
    );

    const restored = restoreWindowGeometry('app-1', viewport);
    expect(restored.widthPct).toBeCloseTo(60);
    expect(restored.heightPct).toBeCloseTo(70);
    expect(restored.x).toBeCloseTo(160);
    expect(restored.y).toBeCloseTo(120);
  });

  it('falls back to defaults when no stored entry exists', () => {
    const defaults = { x: 24, y: 48, widthPct: 55, heightPct: 65 };
    const restored = restoreWindowGeometry('missing-app', viewport, defaults);
    expect(restored).toEqual(defaults);
  });

  it('clamps restored geometry to remain on-screen for smaller viewports', () => {
    saveWindowGeometry(
      'app-2',
      { x: 800, y: 500, widthPct: 70, heightPct: 70 },
      { width: 1920, height: 1080 },
    );

    const smallerViewport = { width: 1280, height: 720 };
    const restored = restoreWindowGeometry('app-2', smallerViewport);
    expect(restored.widthPct).toBeCloseTo(70);
    expect(restored.heightPct).toBeCloseTo(70);
    const widthPx = (restored.widthPct! / 100) * smallerViewport.width;
    const heightPx = (restored.heightPct! / 100) * smallerViewport.height;
    expect(restored.x).toBeGreaterThanOrEqual(0);
    expect(restored.y).toBeGreaterThanOrEqual(0);
    expect(restored.x!).toBeLessThanOrEqual(smallerViewport.width - widthPx + 0.1);
    expect(restored.y!).toBeLessThanOrEqual(smallerViewport.height - heightPx + 0.1);
  });

  it('removes stored geometry entries for specific apps', () => {
    saveWindowGeometry(
      'app-3',
      { x: 200, y: 150, widthPct: 65, heightPct: 75 },
      viewport,
    );

    removeWindowGeometry('app-3');
    const restored = restoreWindowGeometry('app-3', viewport, { widthPct: 50, heightPct: 60 });
    expect(restored.widthPct).toBeCloseTo(50);
    expect(restored.heightPct).toBeCloseTo(60);
    expect(restored.x).toBeUndefined();
    expect(restored.y).toBeUndefined();
  });

  it('clears all stored geometry entries', () => {
    saveWindowGeometry(
      'app-4',
      { x: 120, y: 80, widthPct: 55, heightPct: 65 },
      viewport,
    );
    clearAllWindowGeometry();
    const restored = restoreWindowGeometry('app-4', viewport, { widthPct: 40, heightPct: 50 });
    expect(restored.widthPct).toBeCloseTo(40);
    expect(restored.heightPct).toBeCloseTo(50);
    expect(restored.x).toBeUndefined();
    expect(restored.y).toBeUndefined();
  });
});
