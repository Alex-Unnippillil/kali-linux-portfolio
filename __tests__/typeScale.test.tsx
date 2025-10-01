jest.mock('../utils/settingsStore', () => {
  const defaults = {
    accent: '#1793d1',
    wallpaper: 'wall-2',
    useKaliWallpaper: false,
    density: 'regular',
    reducedMotion: false,
    fontScale: 1,
    highContrast: false,
    largeHitAreas: false,
    pongSpin: true,
    allowNetwork: false,
    haptics: true,
  } as const;

  type Defaults = typeof defaults;
  const state: { [K in keyof Defaults]: Defaults[K] } = { ...defaults };

  const makeGetter = <K extends keyof Defaults>(key: K) =>
    jest.fn(async () => state[key]);

  const makeSetter = <K extends keyof Defaults>(key: K) =>
    jest.fn(async (value: Defaults[K]) => {
      state[key] = value;
    });

  return {
    __esModule: true,
    defaults,
    getAccent: makeGetter('accent'),
    setAccent: makeSetter('accent'),
    getWallpaper: makeGetter('wallpaper'),
    setWallpaper: makeSetter('wallpaper'),
    getUseKaliWallpaper: makeGetter('useKaliWallpaper'),
    setUseKaliWallpaper: makeSetter('useKaliWallpaper'),
    getDensity: makeGetter('density'),
    setDensity: makeSetter('density'),
    getReducedMotion: makeGetter('reducedMotion'),
    setReducedMotion: makeSetter('reducedMotion'),
    getFontScale: makeGetter('fontScale'),
    setFontScale: makeSetter('fontScale'),
    getHighContrast: makeGetter('highContrast'),
    setHighContrast: makeSetter('highContrast'),
    getLargeHitAreas: makeGetter('largeHitAreas'),
    setLargeHitAreas: makeSetter('largeHitAreas'),
    getPongSpin: makeGetter('pongSpin'),
    setPongSpin: makeSetter('pongSpin'),
    getAllowNetwork: makeGetter('allowNetwork'),
    setAllowNetwork: makeSetter('allowNetwork'),
    getHaptics: makeGetter('haptics'),
    setHaptics: makeSetter('haptics'),
    __resetMockState: () => {
      Object.assign(state, defaults);
    },
  };
});

import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings, TYPE_SCALE_RANGE } from '../hooks/useSettings';
import * as settingsStore from '../utils/settingsStore';

const getRootStyleValue = (property: string) =>
  document.documentElement.style.getPropertyValue(property);

describe('type scale settings', () => {
  beforeEach(async () => {
    (settingsStore as any).__resetMockState();
    document.documentElement.style.removeProperty('--font-multiplier');
    document.documentElement.style.removeProperty('--type-factor');
  });

  test('persists selected type scale across sessions', async () => {
    const { result, unmount } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setFontScale(TYPE_SCALE_RANGE.max);
    });

    await expect(settingsStore.getFontScale()).resolves.toBe(
      TYPE_SCALE_RANGE.max,
    );

    unmount();
  });

  test('updates CSS variables when type scale changes', async () => {
    const { result, unmount } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setFontScale(1.1);
    });

    expect(getRootStyleValue('--font-multiplier')).toBe('1.1');
    expect(getRootStyleValue('--type-factor')).toBe('1.1');

    unmount();
  });
});
