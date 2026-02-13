import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import usePermissions from '../hooks/usePermissions';
import { NotificationsContext } from '../components/common/NotificationCenter';

class MockPermissionStatus implements PermissionStatus {
  state: PermissionState;

  name?: string | undefined;

  onchange: ((this: PermissionStatus, ev: Event) => any) | null = null;

  private listeners = new Set<(event: Event) => void>();

  private listenerMap = new Map<EventListenerOrEventListenerObject, (event: Event) => void>();

  constructor(initialState: PermissionState) {
    this.state = initialState;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (type !== 'change' || !listener) return;
    const callback =
      typeof listener === 'function'
        ? listener
        : (event: Event) => listener.handleEvent?.(event);
    if (!callback) return;
    this.listeners.add(callback);
    this.listenerMap.set(listener, callback);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (type !== 'change' || !listener) return;
    const callback = this.listenerMap.get(listener);
    if (!callback) return;
    this.listeners.delete(callback);
    this.listenerMap.delete(listener);
  }

  dispatch(newState: PermissionState) {
    this.state = newState;
    const event = new Event('change');
    this.listeners.forEach(listener => listener(event));
    this.onchange?.call(this, event);
  }
}

const createWrapper = (pushNotification = jest.fn()) => {
  const value = {
    notificationsByApp: {},
    notifications: [],
    unreadCount: 0,
    pushNotification,
    dismissNotification: jest.fn(),
    clearNotifications: jest.fn(),
    markAllRead: jest.fn(),
  };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );

  return { Wrapper, pushNotification };
};

describe('usePermissions', () => {
  const mediaStream = {
    getTracks: () => [
      {
        stop: jest.fn(),
      },
    ],
  } as unknown as MediaStream;

  let permissionStatuses: Record<string, MockPermissionStatus>;

  const createStatuses = () => ({
    camera: new MockPermissionStatus('prompt'),
    microphone: new MockPermissionStatus('denied'),
    serial: new MockPermissionStatus('prompt'),
    'persistent-storage': new MockPermissionStatus('prompt'),
  });

  const installNavigatorMocks = () => {
    const permissions = {
      query: jest.fn(async (descriptor: PermissionDescriptor) => {
        const name = (descriptor as PermissionDescriptor & { name: string }).name;
        return permissionStatuses[name] ?? null;
      }),
      revoke: jest.fn(async (descriptor: PermissionDescriptor) => {
        const name = (descriptor as PermissionDescriptor & { name: string }).name;
        const status = permissionStatuses[name];
        status?.dispatch('prompt');
        return status;
      }),
    };

    Object.assign(navigator, {
      permissions,
      mediaDevices: {
        getUserMedia: jest.fn(async () => {
          permissionStatuses.camera.dispatch('granted');
          return mediaStream;
        }),
      },
      serial: {
        requestPort: jest.fn(async () => {
          permissionStatuses.serial.dispatch('granted');
          return {
            close: jest.fn(),
          };
        }),
      },
      storage: {
        persist: jest.fn(async () => {
          permissionStatuses['persistent-storage'].dispatch('granted');
          return true;
        }),
      },
    } as Navigator);

    return permissions;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    permissionStatuses = createStatuses();
    installNavigatorMocks();
  });

  test('reads initial permission states and reacts to change events', async () => {
    const { Wrapper, pushNotification } = createWrapper();
    const { result } = renderHook(() => usePermissions(), { wrapper: Wrapper });

    await waitFor(() => {
      const camera = result.current.permissions.find(item => item.key === 'camera');
      expect(camera?.state).toBe('prompt');
    });

    act(() => {
      permissionStatuses.camera.dispatch('granted');
    });

    await waitFor(() => {
      const camera = result.current.permissions.find(item => item.key === 'camera');
      expect(camera?.state).toBe('granted');
    });

    expect(pushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'system-permissions',
        title: expect.stringContaining('Camera'),
      }),
    );
  });

  test('request and revoke actions update state snapshots', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePermissions(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.permissions.every(entry => entry.state !== 'unknown')).toBe(true);
    });

    const getPermission = (key: string) =>
      result.current.permissions.find(permission => permission.key === key)!;

    await act(async () => {
      await getPermission('camera').request();
    });

    await waitFor(() => {
      expect(getPermission('camera').state).toBe('granted');
    });

    await act(async () => {
      await getPermission('camera').revoke();
    });

    await waitFor(() => {
      expect(getPermission('camera').state).toBe('prompt');
    });

    await act(async () => {
      await getPermission('filesystem').request();
    });

    await waitFor(() => {
      expect(getPermission('filesystem').state).toBe('granted');
    });
  });

  test('disables unsupported APIs gracefully', async () => {
    const permissions = installNavigatorMocks();
    delete (navigator as any).serial;
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePermissions(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.permissions.length).toBeGreaterThan(0);
    });

    const serialPermission = result.current.permissions.find(permission => permission.key === 'serial');
    expect(serialPermission?.supported).toBe(false);
    expect(serialPermission?.canRequest).toBe(false);
    expect(permissions.query).toHaveBeenCalled();
  });
});

