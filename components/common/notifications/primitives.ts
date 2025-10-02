import { PRIORITY_ORDER, type NotificationPriority } from '../../../utils/notifications/ruleEngine';
import type { AppNotification } from '../../../hooks/useNotifications';

export const PRIORITY_METADATA: Record<
  NotificationPriority,
  {
    label: string;
    badgeClass: string;
    accentClass: string;
    defaultCollapsed: boolean;
    description: string;
  }
> = {
  critical: {
    label: 'Critical',
    badgeClass: 'bg-red-500 text-white',
    accentClass: 'border-red-500 bg-red-500/10',
    defaultCollapsed: false,
    description: 'Immediate action required alerts.',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-orange-500 text-white',
    accentClass: 'border-orange-400 bg-orange-500/10',
    defaultCollapsed: false,
    description: 'Important follow-up from active tools.',
  },
  normal: {
    label: 'Normal',
    badgeClass: 'bg-sky-500 text-white',
    accentClass: 'border-sky-400 bg-sky-500/5',
    defaultCollapsed: false,
    description: 'Routine updates and summaries.',
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-slate-600 text-white',
    accentClass: 'border-slate-600 bg-slate-500/10',
    defaultCollapsed: true,
    description: 'Verbose background chatter collapses by default.',
  },
};

export type PriorityMetadata = (typeof PRIORITY_METADATA)[NotificationPriority];

export interface FormattedNotification extends AppNotification {
  formattedTime: string;
  readableTime: string;
  metadata: PriorityMetadata;
}

export const createNotificationTimeFormatter = () =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export const formatNotification = (
  notification: AppNotification,
  formatter: Intl.DateTimeFormat,
): FormattedNotification => ({
  ...notification,
  formattedTime: new Date(notification.timestamp).toISOString(),
  readableTime: formatter.format(new Date(notification.timestamp)),
  metadata: PRIORITY_METADATA[notification.priority],
});

export const formatNotifications = (
  notifications: AppNotification[],
  formatter: Intl.DateTimeFormat,
) => notifications.map(notification => formatNotification(notification, formatter));

export interface NotificationGroup {
  priority: NotificationPriority;
  metadata: PriorityMetadata;
  notifications: FormattedNotification[];
}

export const groupNotificationsByPriority = (
  notifications: FormattedNotification[],
): NotificationGroup[] =>
  PRIORITY_ORDER.map(priority => ({
    priority,
    metadata: PRIORITY_METADATA[priority],
    notifications: notifications.filter(notification => notification.priority === priority),
  })).filter(group => group.notifications.length > 0);
