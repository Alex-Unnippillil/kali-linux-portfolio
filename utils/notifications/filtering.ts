import type { AppNotification } from '../../hooks/useNotifications';

export interface NotificationFilters {
  priority: AppNotification['priority'] | 'all';
  appId: string | 'all';
  unreadOnly: boolean;
}

export const defaultFilters: NotificationFilters = {
  priority: 'all',
  appId: 'all',
  unreadOnly: false,
};

export const applyNotificationFilters = (
  notifications: AppNotification[],
  filters: NotificationFilters,
): AppNotification[] => {
  return notifications.filter(notification => {
    if (filters.priority !== 'all' && notification.priority !== filters.priority) {
      return false;
    }
    if (filters.appId !== 'all' && notification.appId !== filters.appId) {
      return false;
    }
    if (filters.unreadOnly && notification.read) {
      return false;
    }
    return true;
  });
};

export const hasNotificationsMatchingFilters = (
  notifications: AppNotification[],
  filters: NotificationFilters,
): boolean => {
  return applyNotificationFilters(notifications, filters).length > 0;
};
