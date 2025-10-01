import type { AppNotification } from '../hooks/useNotifications';
import { applyNotificationFilters, defaultFilters } from '../utils/notifications/filtering';

const baseNotification = (overrides: Partial<AppNotification>): AppNotification => ({
  id: 'test-id',
  appId: 'terminal',
  title: 'Test notification',
  timestamp: Date.now(),
  read: false,
  priority: 'normal',
  classification: {
    priority: 'normal',
    matchedRuleId: null,
    source: 'default',
  },
  ...overrides,
});

describe('applyNotificationFilters', () => {
  const notifications: AppNotification[] = [
    baseNotification({ id: '1', appId: 'terminal', priority: 'critical', read: false }),
    baseNotification({ id: '2', appId: 'terminal', priority: 'high', read: true }),
    baseNotification({ id: '3', appId: 'nmap', priority: 'normal', read: false }),
    baseNotification({ id: '4', appId: 'nmap', priority: 'low', read: true }),
  ];

  it('returns all notifications with default filters', () => {
    const result = applyNotificationFilters(notifications, defaultFilters);
    expect(result).toHaveLength(4);
  });

  it('filters by priority', () => {
    const result = applyNotificationFilters(notifications, {
      ...defaultFilters,
      priority: 'critical',
    });
    expect(result).toEqual([
      expect.objectContaining({ id: '1', priority: 'critical' }),
    ]);
  });

  it('filters by app id', () => {
    const result = applyNotificationFilters(notifications, {
      ...defaultFilters,
      appId: 'nmap',
    });
    expect(result).toHaveLength(2);
    expect(result.every(notification => notification.appId === 'nmap')).toBe(true);
  });

  it('filters unread notifications', () => {
    const result = applyNotificationFilters(notifications, {
      ...defaultFilters,
      unreadOnly: true,
    });
    expect(result).toHaveLength(2);
    expect(result.every(notification => !notification.read)).toBe(true);
  });

  it('applies combined filters', () => {
    const result = applyNotificationFilters(notifications, {
      priority: 'normal',
      appId: 'nmap',
      unreadOnly: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '3', appId: 'nmap', priority: 'normal' });
  });
});
