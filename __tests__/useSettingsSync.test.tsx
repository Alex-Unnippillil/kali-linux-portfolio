import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { loadSettings, resetRemoteState } from '../utils/settingsSync';

describe('useSettings remote sync integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetRemoteState();
  });

  it('surfaces conflicts and allows manual merge resolution', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(result.current.syncStatus).toBe('idle'));

    const baseSnapshot = await loadSettings();
    resetRemoteState({
      data: {
        ...baseSnapshot.data,
        accent: '#e53e3e',
      },
      version: baseSnapshot.version + 1,
      updatedAt: Date.now(),
    });

    act(() => {
      result.current.setTheme('neon');
      result.current.setAccent('#805ad5');
    });

    await act(async () => {
      await result.current.forceSync('manual');
    });

    await waitFor(() => expect(result.current.syncStatus).toBe('conflict'));

    const conflict = result.current.syncConflict;
    expect(conflict?.conflictingKeys).toEqual(['accent']);
    expect(result.current.syncOptions.some((option) => option.id === 'merge')).toBe(
      true,
    );

    await act(async () => {
      await result.current.resolveSyncConflict('merge');
    });

    await waitFor(() => expect(result.current.syncStatus).toBe('idle'));
    expect(result.current.theme).toBe('neon');
    expect(result.current.accent).toBe('#e53e3e');
  });

  it('supports overriding remote data with last write wins', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(result.current.syncStatus).toBe('idle'));

    const baseSnapshot = await loadSettings();
    resetRemoteState({
      data: {
        ...baseSnapshot.data,
        wallpaper: 'wall-4',
      },
      version: baseSnapshot.version + 1,
      updatedAt: Date.now(),
    });

    act(() => {
      result.current.setWallpaper('wall-2');
    });

    await act(async () => {
      await result.current.forceSync('manual');
    });

    await waitFor(() => expect(result.current.syncStatus).toBe('conflict'));

    await act(async () => {
      await result.current.forceSync('last-write-wins');
    });

    await waitFor(() => expect(result.current.syncStatus).toBe('idle'));
    const latest = await loadSettings();
    expect(latest.data.wallpaper).toBe('wall-2');
  });
});
