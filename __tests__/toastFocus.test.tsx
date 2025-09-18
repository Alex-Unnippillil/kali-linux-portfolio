import React from 'react';
import { render, screen } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';
import { DEFAULT_FOCUS_MODE, FocusModeSettings } from '../utils/focusSchedule';

const renderWithFocus = (focusMode: FocusModeSettings) => {
  const value = {
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
    focusMode,
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
    setFocusMode: jest.fn(),
    updateFocusOverride: jest.fn(),
  };

  return render(
    <SettingsContext.Provider value={value}>
      <Toast message="Queued" />
    </SettingsContext.Provider>,
  );
};

describe('focus aware toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('suppresses toast UI when focus mode hides toasts', () => {
    renderWithFocus({
      ...DEFAULT_FOCUS_MODE,
      enabled: true,
      suppressToasts: true,
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders toast when focus mode allows banners', () => {
    renderWithFocus({
      ...DEFAULT_FOCUS_MODE,
      enabled: true,
      suppressToasts: false,
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
