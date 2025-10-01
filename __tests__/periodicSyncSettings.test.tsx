import React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';
import { Settings } from '../components/apps/settings';

jest.mock('../components/util-components/kali-wallpaper', () => {
  const MockKaliWallpaper = () => <div />;
  MockKaliWallpaper.displayName = 'MockKaliWallpaper';
  return { __esModule: true, default: MockKaliWallpaper };
});

describe('Periodic sync settings UI', () => {
  const createContextValue = (overrides: Partial<React.ContextType<typeof SettingsContext>> = {}) => ({
    accent: defaults.accent,
    setAccent: jest.fn(),
    wallpaper: defaults.wallpaper,
    setWallpaper: jest.fn(),
    bgImageName: defaults.wallpaper,
    useKaliWallpaper: defaults.useKaliWallpaper,
    setUseKaliWallpaper: jest.fn(),
    density: defaults.density as 'regular',
    setDensity: jest.fn(),
    reducedMotion: defaults.reducedMotion,
    setReducedMotion: jest.fn(),
    fontScale: defaults.fontScale,
    setFontScale: jest.fn(),
    highContrast: defaults.highContrast,
    setHighContrast: jest.fn(),
    largeHitAreas: defaults.largeHitAreas,
    setLargeHitAreas: jest.fn(),
    pongSpin: defaults.pongSpin,
    setPongSpin: jest.fn(),
    allowNetwork: defaults.allowNetwork,
    setAllowNetwork: jest.fn(),
    haptics: defaults.haptics,
    setHaptics: jest.fn(),
    periodicSyncEnabled: true,
    setPeriodicSyncEnabled: jest.fn(),
    periodicSyncStatus: null,
    setPeriodicSyncStatus: jest.fn(),
    theme: 'default',
    setTheme: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      cb(0);
      return 0;
    };
    window.cancelAnimationFrame = jest.fn();
  });

  it('shows disabled message when periodic sync is turned off', () => {
    const value = createContextValue({ periodicSyncEnabled: false });

    render(
      <SettingsContext.Provider value={value}>
        <Settings />
      </SettingsContext.Provider>,
    );

    expect(screen.getByTestId('periodic-sync-status')).toHaveTextContent('Periodic sync is disabled.');
  });
});
