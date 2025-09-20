import { useContext } from 'react';
import {
  NotificationsContext,
  type PushOptions,
  type AppNotification,
  type NotificationActionInput,
} from '../components/common/NotificationCenter';

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationCenter');
  }
  return ctx;
};

export default useNotifications;

export type { PushOptions, AppNotification, NotificationActionInput };
