import { useCallback } from 'react';

const showNotification = (title: string, body?: string): boolean => {
  try {
    const options = body ? { body } : undefined;
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
};

export const notify = async (title: string, body?: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  const NotificationAPI = window.Notification;
  if (typeof NotificationAPI === 'undefined') {
    return false;
  }

  if (NotificationAPI.permission === 'granted') {
    return showNotification(title, body);
  }

  if (NotificationAPI.permission === 'default') {
    try {
      const permission = await NotificationAPI.requestPermission();
      if (permission === 'granted') {
        return showNotification(title, body);
      }
    } catch {
      return false;
    }
  }

  return false;
};

export const useNotify = () =>
  useCallback((title: string, body?: string) => {
    void notify(title, body);
  }, []);

export default useNotify;
