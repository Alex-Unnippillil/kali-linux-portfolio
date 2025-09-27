import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Tour from '../components/onboarding/Tour';
import { SettingsContext } from '../hooks/useSettings';
import {
  defaults,
  getTourCompleted,
  setTourCompleted,
} from '../utils/settingsStore';

const createSettingsValue = (
  overrides: Partial<React.ContextType<typeof SettingsContext>> = {},
): React.ContextType<typeof SettingsContext> => ({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
  density: defaults.density as 'regular' | 'compact',
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  tourCompleted: false,
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
  setTourCompleted: jest.fn(),
  ...overrides,
} as React.ContextType<typeof SettingsContext>);

describe('desktop tour persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and retrieves completion state', async () => {
    expect(await getTourCompleted()).toBe(false);
    await setTourCompleted(true);
    expect(await getTourCompleted()).toBe(true);
    await setTourCompleted(false);
    expect(await getTourCompleted()).toBe(false);
  });
});

describe('desktop tour navigation', () => {
  it('advances through steps and finishes', () => {
    const setTourCompletedMock = jest.fn();
    const contextValue = createSettingsValue({ setTourCompleted: setTourCompletedMock });

    render(
      <SettingsContext.Provider value={contextValue}>
        <div>
          <div data-tour-target="launcher" style={{ width: 120, height: 120 }} />
          <nav data-tour-target="dock" style={{ width: 56, height: 300 }} />
          <div data-tour-target="window-controls" style={{ width: 160, height: 40 }} />
        </div>
        <Tour />
      </SettingsContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: /launcher/i })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: /dock/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('heading', { name: /window controls/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /finish/i }));
    expect(setTourCompletedMock).toHaveBeenCalledWith(true);
  });
});
