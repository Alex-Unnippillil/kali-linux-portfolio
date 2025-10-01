import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ClearDataSection from '../apps/settings/components/ClearDataSection';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';
import { set as setKeyval } from 'idb-keyval';
import { logEvent } from '../utils/analytics';

jest.mock('../utils/analytics', () => ({
  logEvent: jest.fn(),
}));

type ContextOverrides = Partial<React.ContextType<typeof SettingsContext>>;

const createContextValue = (overrides: ContextOverrides = {}) => ({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
  density: defaults.density as 'regular',
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  setAccent: jest.fn(),
  setWallpaper: jest.fn(),
  setUseKaliWallpaper: jest.fn(),
  setDensity: jest.fn(),
  setReducedMotion: jest.fn(),
  setFontScale: jest.fn(),
  setHighContrast: jest.fn(),
  setLargeHitAreas: jest.fn(),
  setPongSpin: jest.fn(),
  setAllowNetwork: jest.fn(),
  setHaptics: jest.fn(),
  setTheme: jest.fn(),
  ...overrides,
});

const deleteDatabase = async (name: string) => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
    request.onsuccess = () => resolve();
  });
};

let usingFakeTimers = false;

afterEach(async () => {
  jest.clearAllMocks();
  if (usingFakeTimers) {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    usingFakeTimers = false;
  } else {
    jest.useRealTimers();
  }
  await deleteDatabase('keyval-store');
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('ClearDataSection', () => {
  it('requires the confirmation phrase before enabling the clear button', () => {
    const contextValue = createContextValue();
    const { unmount } = render(
      <SettingsContext.Provider value={contextValue}>
        <ClearDataSection />
      </SettingsContext.Provider>,
    );

    const button = screen.getByRole('button', { name: /clear all data/i });
    const input = screen.getByLabelText(/type clear all data/i);

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: 'clear now' } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: 'CLEAR ALL DATA' } });
    expect(button).toBeEnabled();

    unmount();
  });

  it('restores data when undo is triggered within the grace period', async () => {
    jest.useFakeTimers();
    usingFakeTimers = true;

    await deleteDatabase('keyval-store');
    await setKeyval('accent', '#123456');
    await setKeyval('bg-image', 'wall-5');

    window.localStorage.setItem('app:theme', 'neon');
    window.localStorage.setItem('density', 'compact');
    window.localStorage.setItem('use-kali-wallpaper', 'true');
    window.localStorage.setItem('reduced-motion', 'true');
    window.localStorage.setItem('font-scale', '1.25');
    window.localStorage.setItem('high-contrast', 'true');
    window.localStorage.setItem('large-hit-areas', 'true');
    window.localStorage.setItem('pong-spin', 'false');
    window.localStorage.setItem('allow-network', 'true');
    window.localStorage.setItem('haptics', 'false');
    window.sessionStorage.setItem('session-flag', 'persist');

    const contextValue = createContextValue();
    const { unmount } = render(
      <SettingsContext.Provider value={contextValue}>
        <ClearDataSection />
      </SettingsContext.Provider>,
    );

    const input = screen.getByLabelText(/type clear all data/i);
    const clearButton = screen.getByRole('button', { name: /clear all data/i });

    fireEvent.change(input, { target: { value: 'CLEAR ALL DATA' } });

    await act(async () => {
      fireEvent.click(clearButton);
    });

    await waitFor(() =>
      expect(logEvent).toHaveBeenCalledWith({ category: 'settings', action: 'clear_all_data' }),
    );
    expect(window.localStorage.getItem('app:theme')).toBeNull();
    expect(window.sessionStorage.getItem('session-flag')).toBeNull();

    const undoButton = screen.getByRole('button', { name: /undo/i });

    await act(async () => {
      fireEvent.click(undoButton);
    });

    await waitFor(() =>
      expect(logEvent).toHaveBeenCalledWith({ category: 'settings', action: 'clear_all_data_undo' }),
    );

    expect(window.localStorage.getItem('app:theme')).toBe('neon');
    expect(window.localStorage.getItem('density')).toBe('compact');
    expect(window.localStorage.getItem('use-kali-wallpaper')).toBe('true');
    expect(window.localStorage.getItem('high-contrast')).toBe('true');
    expect(window.sessionStorage.getItem('session-flag')).toBe('persist');

    await waitFor(() => expect(contextValue.setAccent).toHaveBeenLastCalledWith('#123456'));
    expect(contextValue.setWallpaper).toHaveBeenLastCalledWith('wall-5');
    expect(contextValue.setUseKaliWallpaper).toHaveBeenLastCalledWith(true);
    expect(contextValue.setDensity).toHaveBeenLastCalledWith('compact');
    expect(contextValue.setReducedMotion).toHaveBeenLastCalledWith(true);
    expect(contextValue.setFontScale).toHaveBeenLastCalledWith(1.25);
    expect(contextValue.setHighContrast).toHaveBeenLastCalledWith(true);
    expect(contextValue.setLargeHitAreas).toHaveBeenLastCalledWith(true);
    expect(contextValue.setPongSpin).toHaveBeenLastCalledWith(false);
    expect(contextValue.setAllowNetwork).toHaveBeenLastCalledWith(true);
    expect(contextValue.setHaptics).toHaveBeenLastCalledWith(false);
    expect(contextValue.setTheme).toHaveBeenLastCalledWith('neon');

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    unmount();
  });
});
