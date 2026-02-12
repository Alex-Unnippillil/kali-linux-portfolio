import { useContext } from 'react';
import { NotificationsContext } from '../components/system/Notifications';

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

export default useNotifications;
