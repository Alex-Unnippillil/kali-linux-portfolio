import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationCenter from '../components/common/NotificationCenter';
import NotificationBell from '../components/ui/NotificationBell';
import { useNotifications } from '../hooks/useNotifications';

describe('NotificationCenter integration', () => {
  const originalSetAppBadge = (navigator as any).setAppBadge;
  const originalClearAppBadge = (navigator as any).clearAppBadge;

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'setAppBadge', {
      value: jest.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window.navigator, 'clearAppBadge', {
      value: jest.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalSetAppBadge) {
      Object.defineProperty(window.navigator, 'setAppBadge', {
        value: originalSetAppBadge,
        configurable: true,
        writable: true,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window.navigator as any).setAppBadge;
    }

    if (originalClearAppBadge) {
      Object.defineProperty(window.navigator, 'clearAppBadge', {
        value: originalClearAppBadge,
        configurable: true,
        writable: true,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window.navigator as any).clearAppBadge;
    }
  });

  const Trigger: React.FC<{ onReload: jest.Mock }> = ({ onReload }) => {
    const { pushNotification } = useNotifications();

    return (
      <button
        type="button"
        onClick={() =>
          pushNotification({
            appId: 'system-update',
            title: 'Update ready',
            body: 'Reload to get the latest version.',
            priority: 'high',
            actions: [
              {
                id: 'reload',
                label: 'Reload',
                onSelect: onReload,
              },
            ],
          })
        }
      >
        Notify
      </button>
    );
  };

  it('pushes service worker notifications and updates the badge count', async () => {
    const onReload = jest.fn();
    render(
      <NotificationCenter>
        <NotificationBell />
        <Trigger onReload={onReload} />
      </NotificationCenter>,
    );

    const trigger = screen.getByRole('button', { name: 'Notify' });
    fireEvent.click(trigger);

    const bellButton = screen.getByRole('button', { name: /open notifications/i });
    expect(bellButton).toHaveTextContent('1');

    await waitFor(() => {
      const calls = (window.navigator.setAppBadge as jest.Mock).mock.calls;
      expect(calls[calls.length - 1][0]).toBe(1);
    });

    fireEvent.click(bellButton);

    const reloadButton = await screen.findByRole('button', { name: /reload/i });
    fireEvent.click(reloadButton);

    expect(onReload).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect((window.navigator.clearAppBadge as jest.Mock).mock.calls.length).toBeGreaterThan(0),
    );
  });
});
