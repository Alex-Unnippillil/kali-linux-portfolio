import React, { useContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import {
  AppNotification,
  NotificationCenter,
  NotificationsContext,
} from '../components/common/NotificationCenter';
import * as persistence from '../utils/notifications/storage';

jest.mock('../utils/notifications/storage');

const mockedPersistence = persistence as jest.Mocked<typeof persistence>;

const createNotification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 'ntf-1',
  appId: 'terminal',
  title: 'System update available',
  timestamp: Date.now(),
  read: false,
  priority: 'high',
  classification: {
    priority: 'high',
    matchedRuleId: null,
    source: 'default',
  },
  ...overrides,
});

const UnreadCountProbe = () => {
  const context = useContext(NotificationsContext);
  if (!context) return null;
  return <div data-testid="unread-count">{context.unreadCount}</div>;
};

describe('NotificationCenter persistence', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedPersistence.loadPersistedNotifications.mockResolvedValue({});
    mockedPersistence.persistNotificationsState.mockResolvedValue();
  });

  it('restores unread counts from persisted notifications', async () => {
    const persistedState = {
      terminal: [
        createNotification(),
        createNotification({ id: 'ntf-2', read: true, timestamp: Date.now() - 1000 }),
      ],
    };

    mockedPersistence.loadPersistedNotifications.mockResolvedValue(persistedState);

    render(
      <NotificationCenter>
        <UnreadCountProbe />
      </NotificationCenter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });

    expect(mockedPersistence.persistNotificationsState).toHaveBeenCalledWith(
      expect.objectContaining({ terminal: expect.any(Array) }),
    );
  });
});

