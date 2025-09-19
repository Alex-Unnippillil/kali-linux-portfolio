import {
  WINDOW_LAYOUT_STORAGE_KEY,
  getDisplayId,
  loadWindowLayouts,
  mergeLayout,
  saveWindowLayouts,
  WindowLayout,
} from '../utils/windowLayoutPersistence';

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
  Object.defineProperty(window, 'screen', {
    configurable: true,
    value: { width, height, availLeft: 0, availTop: 0 },
  });
  Object.defineProperty(window, 'screenLeft', {
    configurable: true,
    value: 0,
  });
  Object.defineProperty(window, 'screenTop', {
    configurable: true,
    value: 0,
  });
}

describe('window layout persistence', () => {
  beforeEach(() => {
    setViewport(1280, 720);
    window.localStorage.clear();
  });

  test('persists and hydrates layouts across round trips', () => {
    const displayId = getDisplayId();
    const layouts: Record<string, WindowLayout> = {
      'about-alex': {
        x: 120,
        y: 80,
        widthPct: 60,
        heightPct: 70,
        snapped: null,
        maximized: false,
      },
      terminal: {
        x: 0,
        y: 0,
        widthPct: 50,
        heightPct: 96.3,
        snapped: 'left',
        maximized: false,
        lastWidthPct: 70,
        lastHeightPct: 75,
      },
    };
    saveWindowLayouts(displayId, layouts);

    const restored = loadWindowLayouts(displayId);
    expect(restored['about-alex']).toMatchObject({
      x: 120,
      y: 80,
      widthPct: 60,
      heightPct: 70,
      snapped: null,
    });
    expect(restored.terminal).toMatchObject({
      snapped: 'left',
      widthPct: 50,
      lastWidthPct: 70,
      lastHeightPct: 75,
    });
  });

  test('clamps layouts that would render off-screen', () => {
    const displayId = getDisplayId();
    saveWindowLayouts(displayId, {
      'about-alex': {
        x: 5000,
        y: -200,
        widthPct: 40,
        heightPct: 50,
        snapped: null,
        maximized: false,
      },
    });

    const restored = loadWindowLayouts(displayId);
    const layout = restored['about-alex'];
    expect(layout.x).toBeGreaterThanOrEqual(0);
    expect(layout.y).toBeGreaterThanOrEqual(0);
    expect(layout.x).toBeLessThanOrEqual(1280 - (layout.widthPct / 100) * 1280 + 0.0001);
    expect(layout.y).toBeLessThanOrEqual(720 - (layout.heightPct / 100) * 720 + 0.0001);

    const stored = JSON.parse(
      window.localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY) as string,
    );
    expect(stored.displays[displayId]['about-alex'].x).toBe(layout.x);
  });

  test('migrates legacy desktop-session payloads', () => {
    window.localStorage.setItem(
      'desktop-session',
      JSON.stringify({
        windows: [{ id: 'about-alex', x: 4200, y: -50 }],
        wallpaper: 'wall-2',
        dock: [],
      }),
    );

    const displayId = getDisplayId();
    const restored = loadWindowLayouts(displayId);
    expect(restored['about-alex']).toBeDefined();
    expect(restored['about-alex'].x).toBeGreaterThanOrEqual(0);
    expect(restored['about-alex'].y).toBeGreaterThanOrEqual(0);
    expect(window.localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY)).not.toBeNull();
  });

  test('mergeLayout clamps partial updates', () => {
    const base: WindowLayout = {
      x: 100,
      y: 100,
      widthPct: 60,
      heightPct: 60,
      snapped: null,
      maximized: false,
    };

    const merged = mergeLayout(base, { x: 9999, y: -500 });
    expect(merged.x).toBeGreaterThanOrEqual(0);
    expect(merged.x).toBeLessThanOrEqual(1280 - (merged.widthPct / 100) * 1280 + 0.0001);
    expect(merged.y).toBeGreaterThanOrEqual(0);
  });
});

