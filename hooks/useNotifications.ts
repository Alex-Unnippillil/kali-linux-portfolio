import { useContext } from 'react';
import { NotificationsContext } from '../components/system/Notifications';

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationCenter');
  }
  return ctx;
};

export default useNotifications;
