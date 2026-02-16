import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WeatherApp from '../apps/weather';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';
import { resolveDesktopTheme } from '../utils/theme';

type SettingsOverrides = Partial<React.ContextType<typeof SettingsContext>>;

const desktopTheme = resolveDesktopTheme({
  theme: 'default',
  accent: defaults.accent,
  wallpaperName: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
});

const baseSettings = {
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
  desktopTheme,
  setAccent: () => {},
  setWallpaper: () => {},
  setUseKaliWallpaper: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
  setFontScale: () => {},
  setHighContrast: () => {},
  setLargeHitAreas: () => {},
  setPongSpin: () => {},
  setAllowNetwork: () => {},
  setHaptics: () => {},
  setTheme: () => {},
};

function renderWithSettings(
  ui: React.ReactElement,
  overrides: SettingsOverrides = {},
) {
  const value = { ...baseSettings, ...overrides };
  return render(
    <SettingsContext.Provider value={value}>{ui}</SettingsContext.Provider>,
  );
}

describe('Weather dashboard demo mode', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('loads demo cities when network is disabled and avoids fetch requests', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    renderWithSettings(<WeatherApp />, { allowNetwork: false });

    expect(
      screen.getByText(/Demo mode is available while offline or when network is disabled/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Load demo cities/i }));

    await waitFor(() => {
      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('15°C')).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
