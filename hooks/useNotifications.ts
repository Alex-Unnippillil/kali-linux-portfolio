import { useContext } from 'react';
import { NotificationsContext } from '../components/system/Notifications';

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
};

export default useNotifications;
