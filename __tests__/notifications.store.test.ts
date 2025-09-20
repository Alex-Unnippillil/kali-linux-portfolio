import { buildNotificationGroups, computeSummaryStats } from '../hooks/useNotifications';
import type { AppNotification } from '../types/notifications';

describe('notification grouping', () => {
  const now = 1_700_000_000_000;

  const makeNotification = (overrides: Partial<AppNotification>): AppNotification => ({
    id: overrides.id ?? Math.random().toString(36).slice(2),
    appId: overrides.appId ?? 'terminal',
    subject: overrides.subject ?? 'Status',
    body: overrides.body ?? 'Ping received',
    date: overrides.date ?? now,
    isCritical: overrides.isCritical ?? false,
  });

  it('collapses repeats within five seconds', () => {
    const notifications: Record<string, AppNotification[]> = {
      terminal: [
        makeNotification({ id: 'a', date: now }),
        makeNotification({ id: 'b', date: now + 3_000 }),
      ],
    };

    const groups = buildNotificationGroups(notifications);
    expect(groups).toHaveLength(1);
    expect(groups[0].occurrences).toHaveLength(1);
    expect(groups[0].occurrences[0].repeatCount).toBe(2);
    expect(groups[0].totalCount).toBe(2);
  });

  it('creates new bursts after the repeat window', () => {
    const notifications: Record<string, AppNotification[]> = {
      mail: [
        makeNotification({ id: 'a', subject: 'Inbox', date: now }),
        makeNotification({ id: 'b', subject: 'Inbox', date: now + 6_000 }),
      ],
    };

    const groups = buildNotificationGroups(notifications);
    expect(groups).toHaveLength(1);
    expect(groups[0].occurrences).toHaveLength(2);
    expect(groups[0].occurrences[0].repeatCount).toBe(1);
    expect(groups[0].occurrences[1].repeatCount).toBe(1);
  });

  it('groups by application and subject', () => {
    const notifications: Record<string, AppNotification[]> = {
      mail: [
        makeNotification({ id: 'a', appId: 'mail', subject: 'Inbox', body: 'One' }),
        makeNotification({ id: 'b', appId: 'mail', subject: 'Updates', body: 'Two' }),
      ],
      alerts: [
        makeNotification({ id: 'c', appId: 'alerts', subject: 'System', body: 'Critical', isCritical: true }),
      ],
    };

    const groups = buildNotificationGroups(notifications);
    expect(groups).toHaveLength(3);
    const critical = groups.find(group => group.appId === 'alerts');
    expect(critical?.isCritical).toBe(true);
  });

  it('filters by summary window start', () => {
    const notifications: Record<string, AppNotification[]> = {
      terminal: [
        makeNotification({ id: 'a', date: now - 10_000 }),
        makeNotification({ id: 'b', date: now + 2_000 }),
      ],
    };

    const groups = buildNotificationGroups(notifications, { windowStart: now });
    expect(groups).toHaveLength(1);
    expect(groups[0].totalCount).toBe(1);
  });

  it('computes summary statistics', () => {
    const notifications: Record<string, AppNotification[]> = {
      ops: [
        makeNotification({ id: 'a', subject: 'Queue', date: now }),
        makeNotification({ id: 'b', subject: 'Queue', date: now + 1_000 }),
        makeNotification({ id: 'c', subject: 'Queue', date: now + 6_200 }),
      ],
    };

    const groups = buildNotificationGroups(notifications);
    const stats = computeSummaryStats(groups);
    expect(stats.rawCount).toBe(3);
    expect(stats.cardCount).toBe(1);
    expect(stats.clusterCount).toBe(2);
  });
});
