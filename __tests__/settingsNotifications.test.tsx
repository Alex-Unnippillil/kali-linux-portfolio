import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import { NotificationsContext } from '../components/common/NotificationCenter';

describe('settings notifications', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    originalFetch = window.fetch;
    window.fetch = jest.fn(() => Promise.resolve()) as unknown as typeof window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    jest.clearAllMocks();
  });

  const renderWithNotifications = (pushNotification = jest.fn()) => {
    const wrapper = ({ children }: { children?: React.ReactNode }) => (
      <NotificationsContext.Provider
        value={{
          notificationsByApp: {},
          notifications: [],
          unreadCount: 0,
          pushNotification,
          dismissNotification: jest.fn(),
          clearNotifications: jest.fn(),
          markAllRead: jest.fn(),
        }}
      >
        <SettingsProvider>{children}</SettingsProvider>
      </NotificationsContext.Provider>
    );

    const hook = renderHook(() => useSettings(), { wrapper });
    return { ...hook, pushNotification };
  };

  it('emits a network change notification with metadata when toggled', async () => {
    const pushNotification = jest.fn();
    const { result } = renderWithNotifications(pushNotification);

    await act(async () => {
      result.current.setAllowNetwork(true);
    });

    await waitFor(() => expect(pushNotification).toHaveBeenCalledTimes(1));
    const payload = pushNotification.mock.calls[0][0];
    expect(payload).toMatchObject({
      appId: 'system-settings',
      title: 'Network access enabled',
      hints: expect.objectContaining({
        'x-kali-setting': 'allow-network',
        state: 'enabled',
        category: 'security',
      }),
    });
  });

  it('emits a haptics change notification with metadata when toggled', async () => {
    const pushNotification = jest.fn();
    const { result } = renderWithNotifications(pushNotification);

    await act(async () => {
      result.current.setHaptics(false);
    });

    await waitFor(() => expect(pushNotification).toHaveBeenCalledTimes(1));
    const payload = pushNotification.mock.calls[0][0];
    expect(payload).toMatchObject({
      appId: 'system-settings',
      title: 'Haptics disabled',
      hints: expect.objectContaining({
        'x-kali-setting': 'haptics',
        state: 'disabled',
        category: 'input',
      }),
    });
  });

  it('respects alert suppression toggles', async () => {
    const pushNotification = jest.fn();
    const { result } = renderWithNotifications(pushNotification);

    await act(async () => {
      result.current.setNetworkChangeAlerts(false);
      result.current.setAllowNetwork(true);
      result.current.setHapticsChangeAlerts(false);
      result.current.setHaptics(false);
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(pushNotification).not.toHaveBeenCalled();
  });
});
