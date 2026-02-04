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

describe('WeatherDashboard', () => {
  const originalCaches = globalThis.caches;
  const originalOnLine = Object.getOwnPropertyDescriptor(
    navigator,
    'onLine',
  );

  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
    globalThis.caches = originalCaches;
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    }
  });

  afterAll(() => {
    globalThis.caches = originalCaches;
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    }
  });

  it('does not fetch when network access is disabled', async () => {
    localStorage.setItem(
      'weather-cities',
      JSON.stringify([
        { id: 'geo:1:2', name: 'Testville', lat: 1, lon: 2 },
      ]),
    );
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    renderWithSettings(<WeatherApp />, { allowNetwork: false });

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('uses cached data while offline', async () => {
    localStorage.setItem(
      'weather-cities',
      JSON.stringify([
        { id: 'geo:3:4', name: 'Cache City', lat: 3, lon: 4 },
      ]),
    );
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    const match = jest.fn().mockResolvedValue({
      json: async () => ({
        current_weather: {
          temperature: 18,
          weathercode: 2,
        },
        daily: {
          time: ['2024-05-22'],
          temperature_2m_max: [20],
          weathercode: [2],
        },
        timezone: 'UTC',
      }),
    });
    const put = jest.fn().mockResolvedValue(undefined);
    globalThis.caches = {
      open: jest.fn().mockResolvedValue({ match, put }),
    } as unknown as CacheStorage;

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    renderWithSettings(<WeatherApp />, { allowNetwork: true });

    await waitFor(() => {
      expect(screen.getByText('Cache City')).toBeInTheDocument();
    });
    expect(screen.getByText('18°C')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds a manual city and renders a tile', () => {
    renderWithSettings(<WeatherApp />, { allowNetwork: false });

    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByLabelText('City name'), {
      target: { value: 'Manual Town' },
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '40.7' },
    });
    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '-74.0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Manual Town')).toBeInTheDocument();
  });
});
