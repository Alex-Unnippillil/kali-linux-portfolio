import { useCallback } from 'react';

type NotifyFn = (title: string, body?: string) => Promise<void>;

const isNotificationSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

const showNotification = (title: string, body?: string) => {
  if (body) {
    new Notification(title, { body });
  } else {
    new Notification(title);
  }
};

const useNotify = () => {
  const notify = useCallback<NotifyFn>(async (title, body) => {
    if (!isNotificationSupported()) {
      return;
    }

    if (Notification.permission !== 'granted') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return;
        }
      } catch {
        return;
      }
    }

    showNotification(title, body);
  }, []);

  return { notify };
};

export default useNotify;
