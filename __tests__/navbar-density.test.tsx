import { render, screen } from '@testing-library/react';
import Navbar from '../components/screen/navbar';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';
import { resolveDesktopTheme } from '../utils/theme';

type Density = 'compact' | 'comfortable' | 'spacious';

const baseContext = {
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
  density: defaults.density as Density,
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  desktopTheme: resolveDesktopTheme({
    theme: 'default',
    accent: defaults.accent,
    wallpaperName: defaults.wallpaper,
    bgImageName: defaults.wallpaper,
    useKaliWallpaper: defaults.useKaliWallpaper,
  }),
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
};

const renderWithDensity = (density: Density) =>
  render(
    <SettingsContext.Provider value={{ ...baseContext, density }}>
      <Navbar />
    </SettingsContext.Provider>,
  );

describe('Navbar density tokens', () => {
  it('updates taskbar class when density preference changes', () => {
    const { rerender } = renderWithDensity('comfortable');

    const taskbar = screen.getByTestId('taskbar-root');
    expect(taskbar).toHaveClass('taskbar-density--comfortable');

    rerender(
      <SettingsContext.Provider value={{ ...baseContext, density: 'compact' }}>
        <Navbar />
      </SettingsContext.Provider>,
    );
    expect(taskbar).toHaveClass('taskbar-density--compact');

    rerender(
      <SettingsContext.Provider value={{ ...baseContext, density: 'spacious' }}>
        <Navbar />
      </SettingsContext.Provider>,
    );
    expect(taskbar).toHaveClass('taskbar-density--spacious');
  });
});
