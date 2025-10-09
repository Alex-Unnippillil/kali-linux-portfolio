import { renderHook, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import * as settingsStore from '../utils/settingsStore';
import * as themeModule from '../utils/theme';

jest.mock('../utils/settingsStore', () => {
  const actual = jest.requireActual('../utils/settingsStore');
  return {
    ...actual,
    getAccent: jest.fn(),
    setAccent: jest.fn(),
    getWallpaper: jest.fn(),
    setWallpaper: jest.fn(),
    getUseKaliWallpaper: jest.fn(),
    setUseKaliWallpaper: jest.fn(),
    getDensity: jest.fn(),
    setDensity: jest.fn(),
    getReducedMotion: jest.fn(),
    setReducedMotion: jest.fn(),
    getFontScale: jest.fn(),
    setFontScale: jest.fn(),
    getHighContrast: jest.fn(),
    setHighContrast: jest.fn(),
    getLargeHitAreas: jest.fn(),
    setLargeHitAreas: jest.fn(),
    getPongSpin: jest.fn(),
    setPongSpin: jest.fn(),
    getAllowNetwork: jest.fn(),
    setAllowNetwork: jest.fn(),
    getHaptics: jest.fn(),
    setHaptics: jest.fn(),
  };
});

jest.mock('../utils/theme', () => {
  const actual = jest.requireActual('../utils/theme');
  return {
    ...actual,
    getTheme: jest.fn(),
    setTheme: jest.fn(),
  };
});

describe('SettingsProvider hydration', () => {
  const originalPerformance = global.performance;
  const originalGlobalThisPerformance = (globalThis as typeof globalThis & {
    performance?: Performance;
  }).performance;
  const originalWindowPerformance = global.window?.performance;
  let performanceStub: Performance;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
    performanceStub = {
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      getEntriesByName: jest.fn().mockReturnValue([{ duration: 5 }]),
    } as unknown as Performance;
    (global as any).performance = performanceStub;
    (globalThis as any).performance = performanceStub;
    if (global.window) {
      (global as any).window.performance = performanceStub;
    }
    (settingsStore.getAccent as jest.Mock).mockResolvedValue('#abcdef');
    (settingsStore.getWallpaper as jest.Mock).mockResolvedValue('wall-custom');
    (settingsStore.getUseKaliWallpaper as jest.Mock).mockResolvedValue(false);
    (settingsStore.getDensity as jest.Mock).mockResolvedValue('compact');
    (settingsStore.getReducedMotion as jest.Mock).mockResolvedValue(true);
    (settingsStore.getFontScale as jest.Mock).mockResolvedValue(1.25);
    (settingsStore.getHighContrast as jest.Mock).mockResolvedValue(true);
    (settingsStore.getLargeHitAreas as jest.Mock).mockResolvedValue(true);
    (settingsStore.getPongSpin as jest.Mock).mockResolvedValue(false);
    (settingsStore.getAllowNetwork as jest.Mock).mockResolvedValue(true);
    (settingsStore.getHaptics as jest.Mock).mockResolvedValue(false);
    (themeModule.getTheme as jest.Mock).mockReturnValue('matrix');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global as any).performance = originalPerformance;
    (globalThis as any).performance = originalGlobalThisPerformance;
    if (global.window) {
      (global as any).window.performance = originalWindowPerformance;
    }
  });

  it('hydrates persisted values and records hydration timing', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => {
      expect(result.current.accent).toBe('#abcdef');
      expect(result.current.wallpaper).toBe('wall-custom');
      expect(result.current.useKaliWallpaper).toBe(false);
      expect(result.current.density).toBe('compact');
      expect(result.current.reducedMotion).toBe(true);
      expect(result.current.fontScale).toBe(1.25);
      expect(result.current.highContrast).toBe(true);
      expect(result.current.largeHitAreas).toBe(true);
      expect(result.current.pongSpin).toBe(false);
      expect(result.current.allowNetwork).toBe(true);
      expect(result.current.haptics).toBe(false);
      expect(result.current.theme).toBe('matrix');
      expect(result.current.bgImageName).toBe('wall-custom');
    });

    expect(
      (
        globalThis as typeof globalThis & {
          __settingsHydrationDuration?: number;
        }
      ).__settingsHydrationDuration
    ).toEqual(expect.any(Number));
  });
});

