import { useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { setWebVitalsNotificationClient } from '../../utils/reportWebVitals';

const NotificationClientBridge = () => {
  const { pushNotification } = useNotifications();

  useEffect(() => {
    setWebVitalsNotificationClient({ pushNotification });
    return () => {
      setWebVitalsNotificationClient(null);
    };
  }, [pushNotification]);

  return null;
};

export default NotificationClientBridge;
