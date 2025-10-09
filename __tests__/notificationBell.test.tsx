import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '../components/ui/NotificationBell';
import { NotificationCenter } from '../components/common/NotificationCenter';
import useNotifications from '../hooks/useNotifications';

describe('NotificationBell', () => {
  const TestHarness: React.FC = () => {
    const { pushNotification } = useNotifications();

    React.useEffect(() => {
      pushNotification({
        appId: 'test-app',
        title: 'Test Alert',
        body: 'Investigate unusual activity logs.',
        timestamp: new Date('2023-01-02T03:04:05Z').getTime(),
      });
    }, [pushNotification]);

    return null;
  };

  it('renders notifications with timestamps and allows dismissal', async () => {
    const user = userEvent.setup();

    render(
      <NotificationCenter>
        <NotificationBell />
        <TestHarness />
      </NotificationCenter>,
    );

    const toggleButton = screen.getByRole('button', { name: /open notifications/i });
    expect(within(toggleButton).getByText('1')).toBeInTheDocument();

    await user.click(toggleButton);

    const notificationTitle = await screen.findByText('Test Alert');
    expect(notificationTitle).toBeInTheDocument();

    const notificationItem = notificationTitle.closest('li');
    expect(notificationItem).not.toBeNull();
    const timeElement = within(notificationItem as HTMLElement).getByText((_, node) =>
      node?.tagName === 'TIME',
    );
    expect(timeElement).toHaveAttribute('dateTime', '2023-01-02T03:04:05.000Z');

    const dismissButton = screen.getByRole('button', { name: /dismiss test alert/i });
    await user.click(dismissButton);

    await waitFor(() => {
      expect(screen.getByText(/caught up/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(within(toggleButton).queryByText('1')).not.toBeInTheDocument();
    });
  });
});
