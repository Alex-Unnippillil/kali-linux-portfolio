import { act, renderHook, waitFor } from '@testing-library/react';
import useServiceWorkerRegistration from '../../hooks/useServiceWorkerRegistration';

describe('useServiceWorkerRegistration', () => {
  const originalServiceWorker = (navigator as any).serviceWorker;
  const originalPermissions = (navigator as any).permissions;

  afterEach(() => {
    if (originalServiceWorker !== undefined) {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true,
        writable: true,
      });
    } else {
      delete (navigator as any).serviceWorker;
    }

    if (originalPermissions !== undefined) {
      Object.defineProperty(navigator, 'permissions', {
        value: originalPermissions,
        configurable: true,
        writable: true,
      });
    } else {
      delete (navigator as any).permissions;
    }

    delete (window as any).manualRefresh;
    jest.clearAllMocks();
  });

  it('registers periodic sync when permission is granted', async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const periodicRegisterMock = jest.fn().mockResolvedValue(undefined);
    const registration = {
      update: updateMock,
      periodicSync: {
        register: periodicRegisterMock,
      },
    };

    const registerMock = jest.fn().mockResolvedValue(registration);
    const permissionsQuery = jest.fn().mockResolvedValue({ state: 'granted' });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(navigator, 'permissions', {
      value: { query: permissionsQuery },
      configurable: true,
      writable: true,
    });

    const manualRefreshAvailable = jest.fn();
    const manualRefreshTriggered = jest.fn();
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    renderHook(() =>
      useServiceWorkerRegistration({
        enabled: true,
        logger,
        onManualRefreshAvailable: manualRefreshAvailable,
        onManualRefresh: manualRefreshTriggered,
      })
    );

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(permissionsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'periodic-background-sync' })
      );
    });

    expect(periodicRegisterMock).toHaveBeenCalledWith('content-sync', {
      minInterval: 24 * 60 * 60 * 1000,
    });
    expect(updateMock).not.toHaveBeenCalled();
    expect(manualRefreshAvailable).toHaveBeenCalledTimes(1);

    const manualRefresh = manualRefreshAvailable.mock.calls[0][0];
    expect(typeof manualRefresh).toBe('function');

    await act(async () => {
      await manualRefresh();
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(manualRefreshTriggered).toHaveBeenCalledTimes(1);
  });

  it('falls back to manual update when periodic sync is denied', async () => {
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const periodicRegisterMock = jest.fn().mockResolvedValue(undefined);
    const registration = {
      update: updateMock,
      periodicSync: {
        register: periodicRegisterMock,
      },
    };

    const registerMock = jest.fn().mockResolvedValue(registration);
    const permissionsQuery = jest.fn().mockResolvedValue({ state: 'denied' });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(navigator, 'permissions', {
      value: { query: permissionsQuery },
      configurable: true,
      writable: true,
    });

    const manualRefreshAvailable = jest.fn();
    const manualRefreshTriggered = jest.fn();

    renderHook(() =>
      useServiceWorkerRegistration({
        enabled: true,
        onManualRefreshAvailable: manualRefreshAvailable,
        onManualRefresh: manualRefreshTriggered,
      })
    );

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledTimes(1);
    });

    expect(periodicRegisterMock).not.toHaveBeenCalled();
    expect(manualRefreshAvailable).toHaveBeenCalledTimes(1);

    const manualRefresh = manualRefreshAvailable.mock.calls[0][0];

    await act(async () => {
      await manualRefresh();
    });

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(manualRefreshTriggered).toHaveBeenCalledTimes(1);
  });
});
