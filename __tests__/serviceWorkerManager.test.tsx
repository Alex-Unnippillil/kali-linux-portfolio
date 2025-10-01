import React from 'react';
import { render, waitFor } from '@testing-library/react';
import ServiceWorkerManager from '../components/common/ServiceWorkerManager';
import { SettingsContext } from '../hooks/useSettings';
import { defaults } from '../utils/settingsStore';

describe('ServiceWorkerManager', () => {
  const originalEnv = process.env.NODE_ENV;

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
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    // @ts-expect-error - reset mock service worker between tests
    delete window.navigator.serviceWorker;
    jest.clearAllMocks();
  });

  it('unregisters periodic sync when disabled', async () => {
    const unregister = jest.fn().mockResolvedValue(undefined);
    const getTags = jest.fn().mockResolvedValue(['content-sync']);
    const registerPeriodicSync = jest.fn().mockResolvedValue(undefined);
    const serviceWorkerRegistration = {
      periodicSync: {
        getTags,
        unregister,
        register: registerPeriodicSync,
      },
      update: jest.fn(),
      active: { postMessage: jest.fn() },
    } as unknown as ServiceWorkerRegistration;

    const serviceWorkerGlobal = {
      register: jest.fn().mockResolvedValue(serviceWorkerRegistration),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: serviceWorkerGlobal,
      configurable: true,
    });

    const value = createContextValue();
    const { rerender } = render(
      <SettingsContext.Provider value={value}>
        <ServiceWorkerManager />
      </SettingsContext.Provider>,
    );

    await waitFor(() => {
      expect(serviceWorkerGlobal.register).toHaveBeenCalled();
    });

    const disabledValue = createContextValue({ periodicSyncEnabled: false });

    rerender(
      <SettingsContext.Provider value={disabledValue}>
        <ServiceWorkerManager />
      </SettingsContext.Provider>,
    );

    await waitFor(() => {
      expect(unregister).toHaveBeenCalledWith('content-sync');
    });
  });
});
