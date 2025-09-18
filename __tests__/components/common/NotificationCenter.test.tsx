import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationCenter from '../../../components/common/NotificationCenter';
import {
  NotificationMessage,
  NotificationProvider,
  NotificationThread,
  NotificationsByApp,
} from '../../../components/common/NotificationProvider';

const createThread = ({
  id,
  appId,
  title,
  collapsed = false,
  notifications,
  actions = [],
  lastTimestamp,
  meta,
}: {
  id: string;
  appId: string;
  title: string;
  collapsed?: boolean;
  notifications: NotificationMessage[];
  actions?: NotificationThread['actions'];
  lastTimestamp?: number;
  meta?: Record<string, unknown>;
}): NotificationThread => {
  const derivedLast =
    lastTimestamp ??
    notifications.reduce((max, note) => Math.max(max, note.timestamp), 0);
  const unreadCount = notifications.filter(note => !note.read).length;
  const withDismiss =
    actions.some(action => action.id === 'dismiss')
      ? actions
      : [
          ...actions,
          {
            id: 'dismiss',
            label: 'Dismiss',
          },
        ];
  return {
    id,
    appId,
    title,
    collapsed,
    notifications,
    actions: withDismiss,
    meta,
    unreadCount,
    lastTimestamp: derivedLast,
  };
};

const renderCenter = (initialState: NotificationsByApp) =>
  render(
    <NotificationProvider initialState={initialState}>
      <NotificationCenter />
    </NotificationProvider>
  );

describe('NotificationCenter', () => {
  it('groups threads by app and shows unread counts', () => {
    const state: NotificationsByApp = {
      terminal: [
        createThread({
          id: 'alerts',
          appId: 'terminal',
          title: 'Terminal Alerts',
          notifications: [
            {
              id: 't1',
              message: 'Root login detected',
              timestamp: 100,
              read: false,
            },
          ],
        }),
      ],
      mail: [
        createThread({
          id: 'inbox',
          appId: 'mail',
          title: 'Inbox',
          collapsed: true,
          notifications: [
            { id: 'm1', message: 'Welcome', timestamp: 200, read: false },
            { id: 'm2', message: 'Patch notes', timestamp: 300, read: false },
          ],
        }),
      ],
    };

    renderCenter(state);

    expect(
      screen.getByRole('heading', { level: 3, name: /terminal/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /mail/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Terminal Alerts')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(screen.getByText('Root login detected')).toBeInTheDocument();
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
  });

  it('supports expanding and collapsing threads', () => {
    const state: NotificationsByApp = {
      terminal: [
        createThread({
          id: 'alerts',
          appId: 'terminal',
          title: 'Terminal Alerts',
          collapsed: true,
          notifications: [
            {
              id: 't1',
              message: 'Root login detected',
              timestamp: 100,
              read: false,
            },
          ],
        }),
      ],
    };

    renderCenter(state);

    const toggle = screen.getByRole('button', { name: /terminal alerts/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Root login detected')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Root login detected')).toBeInTheDocument();
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Root login detected')).not.toBeInTheDocument();
  });

  it('filters notifications based on the search input', () => {
    const state: NotificationsByApp = {
      terminal: [
        createThread({
          id: 'alerts',
          appId: 'terminal',
          title: 'Terminal Alerts',
          notifications: [
            { id: 't1', message: 'Kernel updated', timestamp: 100, read: true },
          ],
        }),
      ],
      mail: [
        createThread({
          id: 'inbox',
          appId: 'mail',
          title: 'Inbox',
          notifications: [
            { id: 'm1', message: 'Team meeting tomorrow', timestamp: 200, read: false },
          ],
        }),
      ],
    };

    renderCenter(state);

    const search = screen.getByLabelText(/search notifications/i);
    fireEvent.change(search, { target: { value: 'team' } });

    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Team meeting tomorrow')).toBeInTheDocument();
    expect(screen.queryByText('Terminal Alerts')).not.toBeInTheDocument();
  });

  it('dispatches quick actions and falls back to dismiss when unspecified', async () => {
    const resolve = jest.fn(({ dismiss }: { dismiss: () => void }) => dismiss());
    const state: NotificationsByApp = {
      terminal: [
        createThread({
          id: 'alerts',
          appId: 'terminal',
          title: 'Terminal Alerts',
          notifications: [
            { id: 't1', message: 'Root login detected', timestamp: 100, read: false },
          ],
          actions: [
            {
              id: 'resolve',
              label: 'Resolve',
              handler: resolve,
            },
          ],
        }),
      ],
      mail: [
        createThread({
          id: 'inbox',
          appId: 'mail',
          title: 'Inbox',
          notifications: [
            { id: 'm1', message: 'Team meeting tomorrow', timestamp: 200, read: false },
          ],
        }),
      ],
    };

    renderCenter(state);

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));

    await waitFor(() => expect(resolve).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByText('Terminal Alerts')).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() =>
      expect(screen.getByText('No notifications')).toBeInTheDocument()
    );
  });
});
