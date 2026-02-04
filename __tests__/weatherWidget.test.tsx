import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import WeatherWidget from '../apps/weather_widget';
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

describe('WeatherWidget', () => {
  const originalCaches = globalThis.caches;

  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
    globalThis.caches = originalCaches;
  });

  afterAll(() => {
    globalThis.caches = originalCaches;
  });

  it('renders demo data when network is disabled', async () => {
    renderWithSettings(<WeatherWidget />, { allowNetwork: false });
    await waitFor(() => {
      const summary = screen.getByRole('group', {
        name: 'Current conditions for London, United Kingdom',
      });
      expect(
        screen.getByRole('heading', { name: 'London, United Kingdom' }),
      ).toBeInTheDocument();
      expect(within(summary).getByText('15°C')).toBeInTheDocument();
      expect(
        screen.getByText(/Network access is disabled in Settings/i),
      ).toBeInTheDocument();
    });
  });

  it('avoids network calls when network access is disabled', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    renderWithSettings(<WeatherWidget />, { allowNetwork: false });

    fireEvent.submit(screen.getByRole('button', { name: 'Update' }).closest('form')!);

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('allows switching between Celsius and Fahrenheit', async () => {
    renderWithSettings(<WeatherWidget />, { allowNetwork: false });
    fireEvent.change(screen.getByLabelText('Units'), {
      target: { value: 'imperial' },
    });
    await waitFor(() => {
      const summary = screen.getByRole('group', {
        name: 'Current conditions for London, United Kingdom',
      });
      expect(within(summary).getByText('59°F')).toBeInTheDocument();
    });
  });

  it('fetches live data when network access is enabled', async () => {
    const match = jest.fn().mockResolvedValue(undefined);
    const put = jest.fn().mockResolvedValue(undefined);
    globalThis.caches = {
      open: jest.fn().mockResolvedValue({ match, put }),
    } as unknown as CacheStorage;

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.startsWith('https://geocoding-api.open-meteo.com')) {
          return Promise.resolve({
            ok: true,
            clone() {
              return this as Response;
            },
            json: async () => ({
              results: [
                {
                  name: 'Paris',
                  admin1: 'Île-de-France',
                  country_code: 'FR',
                  latitude: 48.8566,
                  longitude: 2.3522,
                  timezone: 'Europe/Paris',
                },
              ],
            }),
          } as Response);
        }
        if (url.startsWith('https://api.open-meteo.com')) {
          return Promise.resolve({
            ok: true,
            clone() {
              return this as Response;
            },
            json: async () => ({
              current_weather: {
                temperature: 21,
                weathercode: 1,
                time: '2024-05-22T12:00',
              },
              hourly: {
                time: ['2024-05-22T11:00', '2024-05-22T12:00'],
                apparent_temperature: [20, 22],
              },
              daily: {
                time: ['2024-05-22', '2024-05-23', '2024-05-24'],
                temperature_2m_max: [23, 24, 25],
                weathercode: [2, 3, 1],
                sunrise: [
                  '2024-05-22T05:55',
                  '2024-05-23T05:54',
                  '2024-05-24T05:53',
                ],
                sunset: [
                  '2024-05-22T21:45',
                  '2024-05-23T21:46',
                  '2024-05-24T21:47',
                ],
              },
            }),
          } as unknown as Response);
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      });

    renderWithSettings(<WeatherWidget />, { allowNetwork: true });

    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          name: 'Paris, Île-de-France, FR',
        }),
      ).toBeInTheDocument(),
    );

    expect(screen.getByText('21°C')).toBeInTheDocument();
    expect(screen.getByText(/Feels like 22°/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Network access is disabled in Settings/i),
    ).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalled();
  });

  it('shows an error when the city is not found', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.startsWith('https://geocoding-api.open-meteo.com')) {
          return Promise.resolve({
            ok: true,
            clone() {
              return this as Response;
            },
            json: async () => ({ results: [] }),
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      });

    renderWithSettings(<WeatherWidget />, { allowNetwork: true });

    fireEvent.change(screen.getByLabelText('Search city'), {
      target: { value: 'Nowhere' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(screen.getByText(/City not found/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalled();
  });
});
