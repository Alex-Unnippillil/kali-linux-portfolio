import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

const baseSettings = {
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  density: defaults.density,
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  taskbarAlignment: defaults.taskbarAlignment,
  taskbarCompact: defaults.taskbarCompact,
  setAccent: jest.fn(),
  setWallpaper: jest.fn(),
  setDensity: jest.fn(),
  setReducedMotion: jest.fn(),
  setFontScale: jest.fn(),
  setHighContrast: jest.fn(),
  setLargeHitAreas: jest.fn(),
  setPongSpin: jest.fn(),
  setAllowNetwork: jest.fn(),
  setHaptics: jest.fn(),
  setTheme: jest.fn(),
  setTaskbarAlignment: jest.fn(),
  setTaskbarCompact: jest.fn(),
};

const renderTaskbar = (props: React.ComponentProps<typeof Taskbar>) =>
  render(
    <SettingsContext.Provider value={baseSettings}>
      <Taskbar {...props} />
    </SettingsContext.Provider>,
  );

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    renderTaskbar({
      apps,
      closed_windows: { app1: false },
      minimized_windows: { app1: false },
      focused_windows: { app1: true },
      openApp,
      minimize,
    });
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    renderTaskbar({
      apps,
      closed_windows: { app1: false },
      minimized_windows: { app1: true },
      focused_windows: { app1: false },
      openApp,
      minimize,
    });
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });
});
