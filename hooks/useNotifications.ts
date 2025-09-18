import { useContext, useMemo } from 'react';
import {
  NotificationsContext,
  type NotificationsContextValue,
} from './notificationsContext';
import type {
  AppNotification,
  NotificationGroup,
  NotificationOccurrence,
  NotificationSummaryStats,
} from '../types/notifications';
import { NOTIFICATION_REPEAT_WINDOW_MS } from '../types/notifications';

export type {
  NotificationGroup,
  NotificationOccurrence,
  NotificationSummarySnapshot,
  NotificationSummaryStats,
} from '../types/notifications';

export interface GroupNotificationsOptions {
  windowStart?: number;
  windowEnd?: number;
}

const filterByWindow = (
  notification: AppNotification,
  options: GroupNotificationsOptions,
): boolean => {
  const { windowStart, windowEnd } = options;
  if (windowStart !== undefined && notification.date < windowStart) return false;
  if (windowEnd !== undefined && notification.date > windowEnd) return false;
  return true;
};

const appendToGroup = (
  group: NotificationGroup,
  notification: AppNotification,
) => {
  const occurrences = group.occurrences;
  const lastOccurrence = occurrences[occurrences.length - 1];
  if (
    lastOccurrence &&
    notification.date - lastOccurrence.date <= NOTIFICATION_REPEAT_WINDOW_MS
  ) {
    lastOccurrence.repeatCount += 1;
    lastOccurrence.date = notification.date;
    lastOccurrence.body = notification.body;
    lastOccurrence.isCritical =
      lastOccurrence.isCritical || notification.isCritical;
  } else {
    occurrences.push({
      id: notification.id,
      body: notification.body,
      date: notification.date,
      repeatCount: 1,
      isCritical: notification.isCritical,
    });
  }
  group.totalCount += 1;
  group.lastDate = notification.date;
  group.lastBody = notification.body;
  group.isCritical = group.isCritical || notification.isCritical;
};

export const buildNotificationGroups = (
  notifications: NotificationsContextValue['notifications'],
  options: GroupNotificationsOptions = {},
): NotificationGroup[] => {
  const entries: AppNotification[] = [];
  Object.values(notifications).forEach(list => {
    list.forEach(notification => {
      if (filterByWindow(notification, options)) {
        entries.push(notification);
      }
    });
  });
  entries.sort((a, b) => a.date - b.date);

  const groups = new Map<string, NotificationGroup>();
  entries.forEach(notification => {
    const key = `${notification.appId}::${notification.subject}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        appId: notification.appId,
        subject: notification.subject,
        totalCount: 0,
        lastDate: notification.date,
        lastBody: notification.body,
        occurrences: [],
        isCritical: notification.isCritical,
      };
      groups.set(key, group);
    }
    appendToGroup(group, notification);
  });

  return Array.from(groups.values()).sort((a, b) => b.lastDate - a.lastDate);
};

export const computeSummaryStats = (
  groups: NotificationGroup[],
): NotificationSummaryStats => {
  return groups.reduce(
    (acc, group) => {
      acc.rawCount += group.totalCount;
      acc.cardCount += 1;
      acc.clusterCount += group.occurrences.length;
      return acc;
    },
    { rawCount: 0, cardCount: 0, clusterCount: 0 } as NotificationSummaryStats,
  );
};

export interface UseNotificationsResult extends NotificationsContextValue {
  groupedNotifications: NotificationGroup[];
  summaryGroups: NotificationGroup[];
  totalSummaryGroups: number;
  hiddenGroupCount: number;
  summaryStats: NotificationSummaryStats;
  nextSummaryAt: number | null;
}

export const useNotifications = (): UseNotificationsResult => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationCenter');
  }

  const groupedNotifications = useMemo(
    () => buildNotificationGroups(ctx.notifications),
    [ctx.notifications],
  );

  const windowedGroups = useMemo(
    () =>
      buildNotificationGroups(ctx.notifications, {
        windowStart: ctx.summaryWindowStart,
      }),
    [ctx.notifications, ctx.summaryWindowStart],
  );

  const summaryStats = useMemo(
    () => computeSummaryStats(windowedGroups),
    [windowedGroups],
  );

  const summaryGroups = useMemo(() => {
    if (!ctx.doNotDisturb) return windowedGroups;
    return windowedGroups.filter(group => group.isCritical);
  }, [ctx.doNotDisturb, windowedGroups]);

  const hiddenGroupCount = windowedGroups.length - summaryGroups.length;
  const nextSummaryAt =
    ctx.summaryInterval > 0
      ? ctx.summaryWindowStart + ctx.summaryInterval
      : null;

  return {
    ...ctx,
    groupedNotifications,
    summaryGroups,
    totalSummaryGroups: windowedGroups.length,
    hiddenGroupCount,
    summaryStats,
    nextSummaryAt,
  };
};

export default useNotifications;
