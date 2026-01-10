const idbStore = new Map<string, unknown>();

jest.mock('idb-keyval', () => ({
  __esModule: true,
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
  exportSettings,
  importSettings,
  setAccent,
  setWallpaper,
  setUseKaliWallpaper,
  setDensity,
  setReducedMotion,
  setFontScale,
  setHighContrast,
  setLargeHitAreas,
  setPongSpin,
  setAllowNetwork,
  setHaptics,
  getAccent,
  getWallpaper,
  getUseKaliWallpaper,
  getDensity,
  getReducedMotion,
  getFontScale,
  getHighContrast,
  getLargeHitAreas,
  getPongSpin,
  getAllowNetwork,
  getHaptics,
} from '../utils/settingsStore';
import { getTheme, setTheme } from '../utils/theme';

describe('settings export/import', () => {
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
    jest.clearAllMocks();
    document.documentElement.dataset.theme = '';
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('exportSettings captures all persisted keys', async () => {
    await setAccent('#abcdef');
    await setWallpaper('wall-custom');
    await setUseKaliWallpaper(true);
    await setDensity('compact');
    await setReducedMotion(true);
    await setFontScale(1.5);
    await setHighContrast(true);
    await setLargeHitAreas(true);
    await setPongSpin(false);
    await setAllowNetwork(true);
    await setHaptics(false);
    setTheme('matrix');

    const exported = await exportSettings();
    const parsed = JSON.parse(exported);

    expect(parsed).toEqual({
      accent: '#abcdef',
      wallpaper: 'wall-custom',
      density: 'compact',
      reducedMotion: true,
      fontScale: 1.5,
      highContrast: true,
      largeHitAreas: true,
      pongSpin: false,
      allowNetwork: true,
      haptics: false,
      useKaliWallpaper: true,
      theme: 'matrix',
    });
  });

  test('importSettings restores all persisted values', async () => {
    const payload = {
      accent: '#123456',
      wallpaper: 'wallpaper-7',
      useKaliWallpaper: true,
      density: 'comfortable',
      reducedMotion: true,
      fontScale: 1.4,
      highContrast: true,
      largeHitAreas: true,
      pongSpin: false,
      allowNetwork: true,
      haptics: false,
      theme: 'neon',
    };

    await importSettings(JSON.stringify(payload));

    expect(await getAccent()).toBe(payload.accent);
    expect(await getWallpaper()).toBe(payload.wallpaper);
    expect(await getUseKaliWallpaper()).toBe(payload.useKaliWallpaper);
    expect(await getDensity()).toBe(payload.density);
    expect(await getReducedMotion()).toBe(payload.reducedMotion);
    expect(await getFontScale()).toBe(payload.fontScale);
    expect(await getHighContrast()).toBe(payload.highContrast);
    expect(await getLargeHitAreas()).toBe(payload.largeHitAreas);
    expect(await getPongSpin()).toBe(payload.pongSpin);
    expect(await getAllowNetwork()).toBe(payload.allowNetwork);
    expect(await getHaptics()).toBe(payload.haptics);
    expect(getTheme()).toBe(payload.theme);
  });

  test('gracefully falls back when storage access is denied', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const localStorageSpy = jest
      .spyOn(window, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new Error('denied');
      });

    const exported = await exportSettings();
    const parsed = JSON.parse(exported);

    expect(parsed).toMatchObject({
      density: 'regular',
      reducedMotion: false,
      fontScale: 1,
      highContrast: false,
      largeHitAreas: false,
      pongSpin: true,
      allowNetwork: false,
      haptics: true,
      useKaliWallpaper: false,
    });

    await expect(
      importSettings({
        useKaliWallpaper: true,
        density: 'compact',
        reducedMotion: true,
        highContrast: true,
      })
    ).resolves.toBeUndefined();

    expect(await getUseKaliWallpaper()).toBe(false);
    expect(await getDensity()).toBe('regular');

    localStorageSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
