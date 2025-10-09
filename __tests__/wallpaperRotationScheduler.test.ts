import { act, renderHook, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import {
  defaults,
  setWallpaper as persistWallpaper,
  setWallpaperRotationInterval,
  setWallpaperRotationPlaylist,
  setWallpaperRotationTimestamp,
} from '../utils/settingsStore';

describe('wallpaper rotation scheduler', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    window.localStorage.clear();
    await persistWallpaper(defaults.wallpaper);
    await setWallpaperRotationInterval(0);
    await setWallpaperRotationPlaylist(defaults.rotationPlaylist);
    await setWallpaperRotationTimestamp(Number.NaN);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('advances wallpaper when interval has elapsed before load', async () => {
    await persistWallpaper('wall-1');
    await setWallpaperRotationPlaylist(['wall-1', 'wall-2', 'wall-3']);
    await setWallpaperRotationInterval(60);
    const past = Date.now() - 61 * 60 * 1000;
    await setWallpaperRotationTimestamp(past);

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(result.current.wallpaper).toBe('wall-2');
    });
  });

  test('rotates to next wallpaper after interval elapses', async () => {
    await persistWallpaper('wall-2');
    await setWallpaperRotationPlaylist(['wall-2', 'wall-3', 'wall-4']);
    await setWallpaperRotationInterval(15);
    await setWallpaperRotationTimestamp(Date.now());

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => {
      expect(result.current.wallpaper).toBe('wall-2');
    });

    act(() => {
      jest.advanceTimersByTime(16 * 60 * 1000);
    });

    await waitFor(() => {
      expect(result.current.wallpaper).toBe('wall-3');
    });
  });
});
