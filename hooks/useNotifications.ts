import { useContext } from 'react';
import {
  NotificationsContext,
  NotificationsContextValue,
  NotificationOptions,
} from '../components/common/NotificationCenter';

export const useNotifications = (): NotificationsContextValue => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationCenter');
  }
  return ctx;
};

export default useNotifications;
export type { NotificationOptions, NotificationsContextValue };
