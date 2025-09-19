import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import Settings from '../apps/settings';
import NotificationCenter from '../components/common/NotificationCenter';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import useNotifications from '../hooks/useNotifications';

type PropsWithChildren = { children: React.ReactNode };

const wrapWithSettings = ({ children }: PropsWithChildren) => (
  <SettingsProvider>{children}</SettingsProvider>
);

const flushMicrotasks = () => act(async () => {
  await Promise.resolve();
});

describe('notification preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('sanitizes and persists per-app notification preferences', async () => {
    const { result, unmount } = renderHook(() => useSettings(), {
      wrapper: wrapWithSettings,
    });
    await flushMicrotasks();

    act(() => {
      result.current.updateNotificationPreference('terminal', {
        banners: false,
        sounds: true,
        badges: true,
      });
    });

    await waitFor(() => {
      const raw = window.localStorage.getItem('notification-preferences');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual({
        terminal: { banners: false, sounds: false, badges: true },
      });
    });

    expect(result.current.getNotificationPreference('terminal')).toEqual({
      banners: false,
      sounds: false,
      badges: true,
    });

    unmount();

    const rerendered = renderHook(() => useSettings(), {
      wrapper: wrapWithSettings,
    });
    await flushMicrotasks();

    await waitFor(() => {
      expect(rerendered.result.current.getNotificationPreference('terminal')).toEqual({
        banners: false,
        sounds: false,
        badges: true,
      });
    });

    act(() => {
      rerendered.result.current.resetNotificationPreference('terminal');
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('notification-preferences')).toBeNull();
    });
  });

  test('notifications tab enforces banner and sound dependencies', async () => {
    const user = userEvent.setup();

    render(<Settings />, { wrapper: wrapWithSettings });

    await user.click(screen.getByRole('tab', { name: 'Notifications' }));
    await waitFor(() => {
      const select = screen.getByLabelText('Application') as HTMLSelectElement;
      expect(select.value).not.toBe('');
    });

    const bannerSwitch = screen.getByRole('switch', {
      name: 'Toggle notification banners',
    });
    const soundSwitch = screen.getByRole('switch', {
      name: 'Toggle notification sounds',
    });
    const restoreButton = screen.getByRole('button', { name: 'Restore defaults' });

    expect(bannerSwitch).toHaveAttribute('aria-checked', 'true');
    expect(soundSwitch).toHaveAttribute('aria-checked', 'true');
    expect(soundSwitch).not.toBeDisabled();
    expect(restoreButton).toBeDisabled();

    await user.click(bannerSwitch);

    await waitFor(() => {
      expect(bannerSwitch).toHaveAttribute('aria-checked', 'false');
      expect(soundSwitch).toHaveAttribute('aria-checked', 'false');
      expect(soundSwitch).toBeDisabled();
      expect(restoreButton).not.toBeDisabled();
    });

    await user.click(restoreButton);

    await waitFor(() => {
      expect(bannerSwitch).toHaveAttribute('aria-checked', 'true');
      expect(soundSwitch).toHaveAttribute('aria-checked', 'true');
      expect(soundSwitch).not.toBeDisabled();
      expect(restoreButton).toBeDisabled();
    });
  });

  test('NotificationCenter respects updated preferences immediately', async () => {
    const user = userEvent.setup();
    const setAppBadge = jest.fn().mockResolvedValue(undefined);
    const clearAppBadge = jest.fn().mockResolvedValue(undefined);
    const originalSetAppBadge = (navigator as any).setAppBadge;
    const originalClearAppBadge = (navigator as any).clearAppBadge;

    Object.defineProperty(navigator, 'setAppBadge', {
      configurable: true,
      value: setAppBadge,
    });
    Object.defineProperty(navigator, 'clearAppBadge', {
      configurable: true,
      value: clearAppBadge,
    });

    const APP_ID = 'terminal';

    const Harness = () => {
      const notifications = useNotifications();
      const { updateNotificationPreference } = useSettings();

      return (
        <>
          <button onClick={() => notifications.pushNotification(APP_ID, 'Ping')}>
            notify
          </button>
          <button
            onClick={() => updateNotificationPreference(APP_ID, { banners: false })}
          >
            disable-banners
          </button>
          <button
            onClick={() => updateNotificationPreference(APP_ID, { badges: false })}
          >
            disable-badges
          </button>
        </>
      );
    };

    try {
      render(
        <SettingsProvider>
          <NotificationCenter>
            <Harness />
          </NotificationCenter>
        </SettingsProvider>,
      );

      await flushMicrotasks();

      await user.click(screen.getByText('notify'));
      await screen.findByRole('status');
      await waitFor(() => {
        expect(setAppBadge).toHaveBeenCalledWith(1);
      });

      await user.click(screen.getByText('disable-banners'));
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('notify'));
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('disable-badges'));
      await user.click(screen.getByText('notify'));

      await waitFor(() => {
        expect(clearAppBadge).toHaveBeenCalled();
      });

      expect(screen.getAllByText('Ping').length).toBeGreaterThanOrEqual(3);
    } finally {
      if (originalSetAppBadge) {
        Object.defineProperty(navigator, 'setAppBadge', {
          configurable: true,
          value: originalSetAppBadge,
        });
      } else {
        delete (navigator as any).setAppBadge;
      }

      if (originalClearAppBadge) {
        Object.defineProperty(navigator, 'clearAppBadge', {
          configurable: true,
          value: originalClearAppBadge,
        });
      } else {
        delete (navigator as any).clearAppBadge;
      }
    }
  });
});
