import {
  SCREEN_ASSIGNMENTS_KEY,
  clampRectToBounds,
  detectScreens,
  placeWindow,
  reconcilePlacementState,
  type PlacementState,
  type ScreenInfo,
} from '@/src/wm/placement';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

const MONITORS: ScreenInfo[] = [
  { id: 'primary', x: 0, y: 0, width: 1920, height: 1080, isPrimary: true },
  { id: 'external', x: 1920, y: 0, width: 2560, height: 1440 },
];

describe('clampRectToBounds', () => {
  it('restricts geometry to the active monitor bounds', () => {
    const bounds = MONITORS[1];
    const rect = { x: 1500, y: -100, width: 2800, height: 1600 };
    const result = clampRectToBounds(rect, bounds);

    expect(result.x).toBeGreaterThanOrEqual(bounds.x);
    expect(result.y).toBe(bounds.y);
    expect(result.width).toBe(bounds.width);
    expect(result.height).toBe(bounds.height);
  });
});

describe('placeWindow', () => {
  it('stores assignments and constrains geometry inside the resolved monitor', () => {
    const storage = createMemoryStorage();
    const desired = { x: 2100, y: -150, width: 1400, height: 1500 };

    const first = placeWindow('win-1', MONITORS, desired, { storage });

    expect(first.monitorId).toBe('external');
    expect(first.geometry.x).toBeGreaterThanOrEqual(MONITORS[1].x);
    expect(first.geometry.y).toBe(MONITORS[1].y);
    expect(first.geometry.width).toBeLessThanOrEqual(MONITORS[1].width);
    expect(first.geometry.height).toBeLessThanOrEqual(MONITORS[1].height);

    const raw = storage.getItem(SCREEN_ASSIGNMENTS_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored['win-1'].preferredMonitorId).toBe('external');
    expect(stored['win-1'].rects.external).toMatchObject(first.geometry);

    const reopen = placeWindow('win-1', MONITORS, undefined, { storage });
    expect(reopen.monitorId).toBe('external');
    expect(reopen.geometry).toEqual(first.geometry);
  });

  it('reassigns to available monitors when the preferred display is missing but keeps the preference', () => {
    const storage = createMemoryStorage();
    const initial = placeWindow('win-2', MONITORS, { x: 2400, y: 50, width: 1200, height: 800 }, { storage });
    expect(initial.monitorId).toBe('external');

    const fallback = placeWindow('win-2', [MONITORS[0]], undefined, { storage });
    expect(fallback.monitorId).toBe('primary');
    expect(fallback.preferredMonitorId).toBe('external');

    const stored = JSON.parse(storage.getItem(SCREEN_ASSIGNMENTS_KEY)!);
    expect(stored['win-2'].preferredMonitorId).toBe('external');
    expect(stored['win-2'].lastActiveMonitorId).toBe('primary');
    expect(stored['win-2'].rects.primary).toBeDefined();

    const restored = placeWindow('win-2', MONITORS, undefined, { storage });
    expect(restored.monitorId).toBe('external');
    expect(restored.geometry).toEqual(initial.geometry);
  });
});

describe('reconcilePlacementState', () => {
  it('keeps preferences while assigning windows to available screens', () => {
    const storage = createMemoryStorage();
    const state: PlacementState = {
      'win-1': {
        preferredMonitorId: 'external',
        lastActiveMonitorId: 'external',
        rects: {
          external: { x: 2300, y: 30, width: 1200, height: 900 },
        },
      },
      'win-2': {
        preferredMonitorId: 'ghost',
        lastActiveMonitorId: 'ghost',
        rects: {
          ghost: { x: 4800, y: 200, width: 800, height: 600 },
        },
      },
    };

    const reconciled = reconcilePlacementState(state, [MONITORS[0]], { storage });

    expect(reconciled['win-1'].preferredMonitorId).toBe('external');
    expect(reconciled['win-1'].lastActiveMonitorId).toBe('primary');
    expect(reconciled['win-1'].rects.primary.x).toBeGreaterThanOrEqual(0);
    expect(reconciled['win-1'].rects.external).toEqual(state['win-1'].rects.external);

    expect(reconciled['win-2'].preferredMonitorId).toBe('ghost');
    expect(reconciled['win-2'].lastActiveMonitorId).toBe('primary');
    expect(reconciled['win-2'].rects.primary.width).toBeLessThanOrEqual(MONITORS[0].width);

    const raw = storage.getItem(SCREEN_ASSIGNMENTS_KEY);
    expect(raw).not.toBeNull();
  });
});

describe('detectScreens', () => {
  it('uses the multi-screen API when available', async () => {
    const getScreens = jest.fn().mockResolvedValue({
      currentScreen: {
        id: '1',
        availLeft: 0,
        availTop: 0,
        availWidth: 1920,
        availHeight: 1080,
        primary: true,
      },
      screens: [
        {
          id: '1',
          availLeft: 0,
          availTop: 0,
          availWidth: 1920,
          availHeight: 1080,
          primary: true,
        },
        {
          id: '2',
          availLeft: 1920,
          availTop: 0,
          availWidth: 1080,
          availHeight: 1920,
        },
      ],
    });

    const stubWindow = {
      innerWidth: 1280,
      innerHeight: 720,
      getScreens,
    } as unknown as Window;

    const monitors = await detectScreens({ getWindow: () => stubWindow });

    expect(getScreens).toHaveBeenCalled();
    expect(monitors).toHaveLength(2);
    expect(monitors[0].id).toBe('1');
    expect(monitors[0].isPrimary).toBe(true);
    expect(monitors[1].x).toBe(1920);
  });

  it('falls back to the primary screen when multi-screen data is unavailable', async () => {
    const stubWindow = {
      innerWidth: 1600,
      innerHeight: 900,
      screen: {
        availWidth: 1600,
        availHeight: 900,
        availLeft: 0,
        availTop: 0,
      },
      screenX: 0,
      screenY: 0,
      screenLeft: 0,
      screenTop: 0,
    } as unknown as Window;

    const monitors = await detectScreens({ getWindow: () => stubWindow });

    expect(monitors).toHaveLength(1);
    expect(monitors[0]).toMatchObject({ id: 'primary', width: 1600, height: 900, x: 0, y: 0 });
    expect(monitors[0].isPrimary).toBe(true);
  });
});
