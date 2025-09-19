import {
  setAccent,
  setWallpaper,
  setDensity,
  setReducedMotion,
  setFontScale,
  setHighContrast,
  setLargeHitAreas,
  setPongSpin,
  setAllowNetwork,
  setHaptics,
  resetSettings,
  getAccent,
  getWallpaper,
  getDensity,
  getReducedMotion,
  getFontScale,
  getHighContrast,
  getLargeHitAreas,
  getPongSpin,
  getAllowNetwork,
  getHaptics,
  defaults,
} from '../utils/settingsStore';
import { getTheme, setTheme } from '../utils/theme';

const idbStore = new Map<string, unknown>();

jest.mock('idb-keyval', () => ({
  get: jest.fn(async (key: string) => idbStore.get(key)),
  set: jest.fn(async (key: string, value: unknown) => {
    idbStore.set(key, value);
  }),
  del: jest.fn(async (key: string) => {
    idbStore.delete(key);
  }),
}));

declare global {
  // eslint-disable-next-line no-var
  var gc: (() => void) | undefined;
}

const measureMemory = () => process.memoryUsage().heapUsed;

const accentOptions = ['#1793d1', '#e53e3e', '#d97706', '#38a169', '#805ad5', '#ed64a6'];
const wallpaperOptions = [
  'wall-1',
  'wall-2',
  'wall-3',
  'wall-4',
  'wall-5',
  'wall-6',
  'wall-7',
  'wall-8',
];
const densityOptions = ['regular', 'compact'] as const;
const fontScales = [0.85, 0.95, 1, 1.05, 1.15, 1.25];
const booleanCycle = [true, false] as const;
const themeOptions = ['default', 'neon', 'dark', 'matrix'] as const;

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

beforeEach(() => {
  idbStore.clear();
  window.localStorage.clear();
  document.documentElement.dataset.theme = '';
  document.documentElement.className = '';
});

describe('settings memory usage regression harness', () => {
  it('toggles 200 settings without growing heap usage', async () => {
    const iterations = 20; // 20 cycles * 10 toggles = 200 changes
    const baseline = measureMemory();
    const samples: number[] = [baseline];

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      await setAccent(accentOptions[iteration % accentOptions.length]);
      await setWallpaper(wallpaperOptions[iteration % wallpaperOptions.length]);
      await setDensity(densityOptions[iteration % densityOptions.length]);
      await setReducedMotion(booleanCycle[iteration % booleanCycle.length]);
      await setFontScale(fontScales[iteration % fontScales.length]);
      await setHighContrast(booleanCycle[(iteration + 1) % booleanCycle.length]);
      await setLargeHitAreas(booleanCycle[iteration % booleanCycle.length]);
      await setPongSpin(booleanCycle[(iteration + 1) % booleanCycle.length]);
      await setAllowNetwork(booleanCycle[iteration % booleanCycle.length]);
      await setHaptics(booleanCycle[(iteration + 1) % booleanCycle.length]);
      setTheme(themeOptions[iteration % themeOptions.length]);

      samples.push(measureMemory());
    }

    await resetSettings();
    setTheme('default');
    samples.push(measureMemory());

    if (typeof global.gc === 'function') {
      global.gc();
      samples.push(measureMemory());
    }

    const tolerance = baseline * 0.2 + 8 * 1024 * 1024; // allow 20% swing + 8MB buffer
    const finalUsage = samples[samples.length - 1];
    expect(finalUsage).toBeLessThanOrEqual(baseline + tolerance);

    const peakUsage = Math.max(...samples);
    expect(peakUsage).toBeLessThanOrEqual(baseline + tolerance * 1.5);

    const [
      accent,
      wallpaper,
      density,
      reducedMotion,
      fontScale,
      highContrast,
      largeHitAreas,
      pongSpin,
      allowNetwork,
      haptics,
    ] = await Promise.all([
      getAccent(),
      getWallpaper(),
      getDensity(),
      getReducedMotion(),
      getFontScale(),
      getHighContrast(),
      getLargeHitAreas(),
      getPongSpin(),
      getAllowNetwork(),
      getHaptics(),
    ]);

    expect(accent).toBe(defaults.accent);
    expect(wallpaper).toBe(defaults.wallpaper);
    expect(density).toBe(defaults.density);
    expect(reducedMotion).toBe(defaults.reducedMotion);
    expect(fontScale).toBe(defaults.fontScale);
    expect(highContrast).toBe(defaults.highContrast);
    expect(largeHitAreas).toBe(defaults.largeHitAreas);
    expect(pongSpin).toBe(defaults.pongSpin);
    expect(allowNetwork).toBe(defaults.allowNetwork);
    expect(haptics).toBe(defaults.haptics);
    expect(getTheme()).toBe('default');

    expect(samples.length).toBeGreaterThan(iterations / 2);
  });
});
