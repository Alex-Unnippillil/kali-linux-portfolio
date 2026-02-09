import { useContext, useMemo } from 'react';
import { NotificationsContext } from '../components/common/NotificationCenter';
import { PRIORITY_ORDER, NotificationPriority } from '../utils/notifications/ruleEngine';

export type {
  AppNotification,
  PushNotificationInput,
  NotificationPriority,
} from '../components/common/NotificationCenter';
export type {
  ClassificationResult,
  NotificationHints,
} from '../utils/notifications/ruleEngine';

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationCenter');
  }
  return ctx;
};

export interface NotificationBadge {
  type: 'count';
  tone: 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  count: number;
  displayValue: string;
  label: string;
  max: number;
  pulse: boolean;
}

const PRIORITY_TONE_MAP: Record<NotificationPriority, NotificationBadge['tone']> = {
  critical: 'danger',
  high: 'warning',
  normal: 'info',
  low: 'neutral',
};

const getHighestPriority = (priorities: NotificationPriority[]): NotificationPriority => {
  for (const priority of PRIORITY_ORDER) {
    if (priorities.includes(priority)) return priority;
  }
  return 'normal';
};

export const useNotificationBadges = ({
  enabled = true,
  maxCount = 99,
  disablePulse = false,
}: {
  enabled?: boolean;
  maxCount?: number;
  disablePulse?: boolean;
} = {}): Record<string, NotificationBadge> => {
  const { notificationsByApp } = useNotifications();

  return useMemo(() => {
    if (!enabled) return {};
    const next: Record<string, NotificationBadge> = {};

    Object.entries(notificationsByApp).forEach(([appId, list]) => {
      const unread = list.filter((notification) => !notification.read);
      if (unread.length === 0) return;

      const count = unread.length;
      const max = Number.isFinite(maxCount) && maxCount > 0 ? Math.floor(maxCount) : 99;
      const displayValue = count > max ? `${max}+` : `${count}`;
      const highestPriority = getHighestPriority(unread.map((item) => item.priority));
      const tone = PRIORITY_TONE_MAP[highestPriority] ?? 'info';
      const pulse = !disablePulse && (highestPriority === 'critical' || highestPriority === 'high');

      next[appId] = {
        type: 'count',
        tone,
        count,
        displayValue,
        label: count === 1 ? '1 notification' : `${displayValue} notifications`,
        max,
        pulse,
      };
    });

    return next;
  }, [notificationsByApp, enabled, maxCount, disablePulse]);
};

export default useNotifications;
