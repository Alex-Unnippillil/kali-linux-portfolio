import React, { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import NotificationCenter from '../components/common/NotificationCenter';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';
import { DEFAULT_FOCUS_MODE, FocusModeSettings } from '../utils/focusSchedule';
import useNotifications from '../hooks/useNotifications';

jest.mock('../utils/analytics.ts', () => ({
  logEvent: jest.fn(),
}));

const focusSettings: FocusModeSettings = {
  ...DEFAULT_FOCUS_MODE,
  enabled: true,
  queueNonCritical: true,
  defaultCadenceMinutes: 1,
};

const Wrapper: React.FC<{ focusMode?: FocusModeSettings }> = ({
  children,
  focusMode = focusSettings,
}) => {
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
  return (
    <SettingsContext.Provider value={value}>
      <NotificationCenter>{children}</NotificationCenter>
    </SettingsContext.Provider>
  );
};

const Trigger: React.FC = () => {
  const { pushNotification } = useNotifications();
  useEffect(() => {
    pushNotification('test-app', 'queued message');
  }, [pushNotification]);
  return null;
};

describe('NotificationCenter focus queueing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.resetModules();
  });

  it('bundles non-critical notifications into summaries', async () => {
    render(
      <Wrapper>
        <Trigger />
      </Wrapper>,
    );

    expect(screen.queryByText('queued message')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(
      await screen.findByText(/test-app summary \(1\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('queued message')).toBeInTheDocument();
  });
});
