const idbStore = new Map<string, unknown>();

jest.mock('idb-keyval', () => ({
  get: jest.fn((key: string) => Promise.resolve(idbStore.get(key))),
  set: jest.fn((key: string, value: unknown) => {
    idbStore.set(key, value);
    return Promise.resolve();
  }),
  del: jest.fn((key: string) => {
    idbStore.delete(key);
    return Promise.resolve();
  }),
}));

import {
  defaults,
  exportSettings,
  getAccent,
  getAllowNetwork,
  getDensity,
  getFontScale,
  getHaptics,
  getHighContrast,
  getLargeHitAreas,
  getPongSpin,
  getReducedMotion,
  getWallpaper,
  importSettings,
  resetSettings,
  setAccent,
  setAllowNetwork,
  setDensity,
  setFontScale,
  setHaptics,
  setHighContrast,
  setLargeHitAreas,
  setPongSpin,
  setReducedMotion,
  setWallpaper,
} from '../utils/settingsStore';
import { getTheme, setTheme } from '../utils/theme';

describe('settingsStore', () => {
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
    document.documentElement.classList.remove('dark');
  });

  it('exports the current settings snapshot', async () => {
    await setAccent('#abcdef');
    await setWallpaper('wall-5');
    await setDensity('compact');
    await setReducedMotion(true);
    await setFontScale(1.2);
    await setHighContrast(true);
    await setLargeHitAreas(true);
    await setPongSpin(false);
    await setAllowNetwork(true);
    await setHaptics(false);
    setTheme('neon');

    const exported = await exportSettings();
    const parsed = JSON.parse(exported);

    expect(parsed).toEqual({
      accent: '#abcdef',
      wallpaper: 'wall-5',
      density: 'compact',
      reducedMotion: true,
      fontScale: 1.2,
      highContrast: true,
      largeHitAreas: true,
      pongSpin: false,
      allowNetwork: true,
      haptics: false,
      theme: 'neon',
    });
  });

  it('imports settings from mixed value types', async () => {
    await importSettings({
      accent: '#123456',
      wallpaper: 'wall-3',
      density: 'compact',
      reducedMotion: 'false',
      fontScale: '1.05',
      highContrast: 1,
      largeHitAreas: 0,
      pongSpin: true,
      allowNetwork: 'true',
      haptics: false,
      theme: 'matrix',
    });

    await expect(getAccent()).resolves.toBe('#123456');
    await expect(getWallpaper()).resolves.toBe('wall-3');
    await expect(getDensity()).resolves.toBe('compact');
    await expect(getReducedMotion()).resolves.toBe(false);
    await expect(getFontScale()).resolves.toBeCloseTo(1.05);
    await expect(getHighContrast()).resolves.toBe(true);
    await expect(getLargeHitAreas()).resolves.toBe(false);
    await expect(getPongSpin()).resolves.toBe(true);
    await expect(getAllowNetwork()).resolves.toBe(true);
    await expect(getHaptics()).resolves.toBe(false);
    expect(getTheme()).toBe('matrix');
  });

  it('resets settings back to defaults', async () => {
    await setAccent('#ffffff');
    await setWallpaper('wall-6');
    await setDensity('compact');
    await setReducedMotion(true);
    await setFontScale(1.4);
    await setHighContrast(true);
    await setLargeHitAreas(true);
    await setPongSpin(false);
    await setAllowNetwork(true);
    await setHaptics(false);

    await resetSettings();

    await expect(getAccent()).resolves.toBe(defaults.accent);
    await expect(getWallpaper()).resolves.toBe(defaults.wallpaper);
    await expect(getDensity()).resolves.toBe(defaults.density);
    await expect(getReducedMotion()).resolves.toBe(defaults.reducedMotion);
    await expect(getFontScale()).resolves.toBe(defaults.fontScale);
    await expect(getHighContrast()).resolves.toBe(defaults.highContrast);
    await expect(getLargeHitAreas()).resolves.toBe(defaults.largeHitAreas);
    await expect(getPongSpin()).resolves.toBe(defaults.pongSpin);
    await expect(getAllowNetwork()).resolves.toBe(defaults.allowNetwork);
    await expect(getHaptics()).resolves.toBe(defaults.haptics);
  });
});
