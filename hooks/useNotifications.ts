import { useContext } from 'react';
import { NotificationsContext } from '../components/common/NotificationCenter';

export type {
  AppNotification,
  PushNotificationInput,
  NotificationPriority,
} from '../components/common/NotificationCenter';
export type {
  ClassificationResult,
  NotificationHints,
} from '../utils/notifications/ruleEngine';

export const useNotificationCenter = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationCenter must be used within NotificationCenter');
  }
  return ctx;
};

export const useNotifications = () => useNotificationCenter();

export default useNotifications;
