import { act, renderHook, waitFor } from '@testing-library/react';

const defaultsMock = {
  accent: '#112233',
  wallpaper: 'wall-2',
  useKaliWallpaper: false,
  density: 'regular' as const,
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
};

const getAccentMock = jest.fn().mockResolvedValue(defaultsMock.accent);
const setAccentMock = jest.fn().mockResolvedValue(undefined);
const getWallpaperMock = jest.fn().mockResolvedValue(defaultsMock.wallpaper);
const setWallpaperMock = jest.fn().mockResolvedValue(undefined);
const getUseKaliWallpaperMock = jest.fn().mockResolvedValue(defaultsMock.useKaliWallpaper);
const setUseKaliWallpaperMock = jest.fn().mockResolvedValue(undefined);
const getDensityMock = jest.fn().mockResolvedValue(defaultsMock.density);
const setDensityMock = jest.fn().mockResolvedValue(undefined);
const getReducedMotionMock = jest.fn().mockResolvedValue(defaultsMock.reducedMotion);
const setReducedMotionMock = jest.fn().mockResolvedValue(undefined);
const getFontScaleMock = jest.fn().mockResolvedValue(defaultsMock.fontScale);
const setFontScaleMock = jest.fn().mockResolvedValue(undefined);
const getHighContrastMock = jest.fn().mockResolvedValue(defaultsMock.highContrast);
const setHighContrastMock = jest.fn().mockResolvedValue(undefined);
const getLargeHitAreasMock = jest.fn().mockResolvedValue(defaultsMock.largeHitAreas);
const setLargeHitAreasMock = jest.fn().mockResolvedValue(undefined);
const getPongSpinMock = jest.fn().mockResolvedValue(defaultsMock.pongSpin);
const setPongSpinMock = jest.fn().mockResolvedValue(undefined);
const getAllowNetworkMock = jest.fn().mockResolvedValue(defaultsMock.allowNetwork);
const setAllowNetworkMock = jest.fn().mockResolvedValue(undefined);
const getHapticsMock = jest.fn().mockResolvedValue(defaultsMock.haptics);
const setHapticsMock = jest.fn().mockResolvedValue(undefined);

jest.mock('../../utils/theme', () => ({
  __esModule: true,
  getTheme: jest.fn(() => 'default'),
  setTheme: jest.fn(),
}));

jest.mock('../../utils/settingsStore', () => ({
  __esModule: true,
  defaults: defaultsMock,
  getAccent: getAccentMock,
  setAccent: setAccentMock,
  getWallpaper: getWallpaperMock,
  setWallpaper: setWallpaperMock,
  getUseKaliWallpaper: getUseKaliWallpaperMock,
  setUseKaliWallpaper: setUseKaliWallpaperMock,
  getDensity: getDensityMock,
  setDensity: setDensityMock,
  getReducedMotion: getReducedMotionMock,
  setReducedMotion: setReducedMotionMock,
  getFontScale: getFontScaleMock,
  setFontScale: setFontScaleMock,
  getHighContrast: getHighContrastMock,
  setHighContrast: setHighContrastMock,
  getLargeHitAreas: getLargeHitAreasMock,
  setLargeHitAreas: setLargeHitAreasMock,
  getPongSpin: getPongSpinMock,
  setPongSpin: setPongSpinMock,
  getAllowNetwork: getAllowNetworkMock,
  setAllowNetwork: setAllowNetworkMock,
  getHaptics: getHapticsMock,
  setHaptics: setHapticsMock,
}));

const { SettingsProvider, useSettings }: typeof import('../../hooks/useSettings') = require('../../hooks/useSettings');
const settingsStore = require('../../utils/settingsStore') as jest.Mocked<typeof import('../../utils/settingsStore')>;

describe('SettingsProvider integration', () => {
  const originalFetch = window.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.style.cssText = '';
    document.documentElement.className = '';
    fetchMock = jest.fn().mockResolvedValue('ok');
    window.fetch = fetchMock as unknown as typeof window.fetch;
  });

  afterAll(() => {
    window.fetch = originalFetch;
  });

  const shadeColor = (color: string, percent: number): string => {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const R = f >> 16;
    const G = (f >> 8) & 0x00ff;
    const B = f & 0x0000ff;
    const newR = Math.round((t - R) * p) + R;
    const newG = Math.round((t - G) * p) + G;
    const newB = Math.round((t - B) * p) + B;
    return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
      .toString(16)
      .slice(1)}`;
  };

  it('updates accent, persists it, and syncs CSS variables', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(getAccentMock).toHaveBeenCalled());

    const newAccent = '#445566';
    act(() => result.current.setAccent(newAccent));

    await waitFor(() => expect(result.current.accent).toBe(newAccent));

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe(newAccent)
    );
    expect(
      document.documentElement.style.getPropertyValue('--color-ub-border-orange')
    ).toBe(shadeColor(newAccent, -0.2));
    expect(settingsStore.setAccent).toHaveBeenCalledWith(newAccent);
  });

  it('switches density spacing tokens and writes to storage', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(getDensityMock).toHaveBeenCalled());

    act(() => result.current.setDensity('compact'));

    await waitFor(() => expect(result.current.density).toBe('compact'));

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--space-1')).toBe('0.125rem')
    );
    expect(settingsStore.setDensity).toHaveBeenCalledWith('compact');
  });

  it('toggles network access, persists the flag, and patches fetch', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(getAllowNetworkMock).toHaveBeenCalled());

    act(() => result.current.setAllowNetwork(true));
    await waitFor(() => expect(result.current.allowNetwork).toBe(true));
    expect(settingsStore.setAllowNetwork).toHaveBeenCalledWith(true);
    await expect(window.fetch('https://example.com')).resolves.toBe('ok');
    expect(fetchMock).toHaveBeenLastCalledWith('https://example.com');

    act(() => result.current.setAllowNetwork(false));
    await waitFor(() => expect(result.current.allowNetwork).toBe(false));
    expect(settingsStore.setAllowNetwork).toHaveBeenCalledWith(false);
    await expect(window.fetch('https://example.com')).rejects.toThrow('Network requests disabled');
  });

  it('toggles document classes for accessibility settings', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

    await waitFor(() => expect(getHighContrastMock).toHaveBeenCalled());

    act(() => result.current.setHighContrast(true));
    await waitFor(() => expect(result.current.highContrast).toBe(true));
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    expect(settingsStore.setHighContrast).toHaveBeenCalledWith(true);

    act(() => result.current.setHighContrast(false));
    await waitFor(() => expect(result.current.highContrast).toBe(false));
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    expect(settingsStore.setHighContrast).toHaveBeenCalledWith(false);
  });
});
