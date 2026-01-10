import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import NotificationCenter from '../components/common/NotificationCenter';
import { useNotifications, NotificationPriority } from '../hooks/useNotifications';

describe('NotificationCenter live regions', () => {
  const Trigger: React.FC<{ priority: NotificationPriority }> = ({ priority }) => {
    const { pushNotification } = useNotifications();
    useEffect(() => {
      pushNotification({
        appId: 'test-app',
        title: 'Update ready',
        body: 'Download available',
        priority,
      });
    }, [priority, pushNotification]);
    return null;
  };

  it('announces routine notifications in the polite live region', async () => {
    render(
      <NotificationCenter>
        <Trigger priority="normal" />
      </NotificationCenter>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('notification-live-region').textContent).toContain(
        'Update ready',
      ),
    );
    expect(screen.getByTestId('notification-alert-region').textContent).toBe('');
  });

  it('announces high priority notifications in the alert live region', async () => {
    render(
      <NotificationCenter>
        <Trigger priority="high" />
      </NotificationCenter>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('notification-alert-region').textContent).toContain(
        'Update ready',
      ),
    );
  });
});
