import React, {
  Dispatch,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface AppNotification {
  id: string;
  appId: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
}

export interface PushNotificationInput {
  appId: string;
  title: string;
  body?: string;
  timestamp?: number;
}

interface NotificationsContextValue {
  notificationsByApp: Record<string, AppNotification[]>;
  notifications: AppNotification[];
  unreadCount: number;
  pushNotification: (input: PushNotificationInput) => string;
  dismissNotification: (appId: string, id: string) => void;
  clearNotifications: (appId?: string) => void;
  markAllRead: (appId?: string) => void;
  doNotDisturb: boolean;
  setDoNotDisturb: Dispatch<React.SetStateAction<boolean>>;
  toggleDoNotDisturb: () => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const createId = () => `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DO_NOT_DISTURB_STORAGE_KEY = 'notifications:doNotDisturb';

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notificationsByApp, setNotificationsByApp] = useState<
    Record<string, AppNotification[]>
  >({});
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedValue = window.localStorage.getItem(DO_NOT_DISTURB_STORAGE_KEY);
    if (storedValue === 'true') setDoNotDisturb(true);
    if (storedValue === 'false') setDoNotDisturb(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      DO_NOT_DISTURB_STORAGE_KEY,
      doNotDisturb ? 'true' : 'false',
    );
  }, [doNotDisturb]);

  const pushNotification = useCallback((input: PushNotificationInput) => {
    const id = createId();
    if (doNotDisturb) {
      return id;
    }

    const timestamp = input.timestamp ?? Date.now();
    setNotificationsByApp(prev => {
      const list = prev[input.appId] ?? [];
      const nextNotification: AppNotification = {
        id,
        appId: input.appId,
        title: input.title,
        body: input.body,
        timestamp,
        read: false,
      };

      return {
        ...prev,
        [input.appId]: [nextNotification, ...list],
      };
    });

    return id;
  }, [doNotDisturb]);

  const dismissNotification = useCallback((appId: string, id: string) => {
    setNotificationsByApp(prev => {
      const list = prev[appId];
      if (!list) return prev;
      const filtered = list.filter(notification => notification.id !== id);
      if (filtered.length === list.length) return prev;

      const next = { ...prev };
      if (filtered.length > 0) next[appId] = filtered;
      else delete next[appId];
      return next;
    });
  }, []);

  const clearNotifications = useCallback((appId?: string) => {
    if (!appId) {
      setNotificationsByApp({});
      return;
    }

    setNotificationsByApp(prev => {
      if (!(appId in prev)) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const markAllRead = useCallback((appId?: string) => {
    setNotificationsByApp(prev => {
      if (appId) {
        const list = prev[appId];
        if (!list || list.every(notification => notification.read)) return prev;
        return {
          ...prev,
          [appId]: list.map(notification => ({ ...notification, read: true })),
        };
      }

      let changed = false;
      const next: Record<string, AppNotification[]> = {};
      Object.entries(prev).forEach(([key, list]) => {
        const updated = list.map(notification => {
          if (notification.read) return notification;
          changed = true;
          return { ...notification, read: true };
        });
        next[key] = updated;
      });
      return changed ? next : prev;
    });
  }, []);

  const notifications = useMemo(() =>
    Object.values(notificationsByApp)
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp),
  [notificationsByApp]);

  const unreadCount = useMemo(
    () => notifications.reduce((sum, notification) => sum + (notification.read ? 0 : 1), 0),
    [notifications],
  );

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (unreadCount > 0) nav.setAppBadge(unreadCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [unreadCount]);

  const toggleDoNotDisturb = useCallback(() => {
    setDoNotDisturb(prev => !prev);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notificationsByApp,
        notifications,
        unreadCount,
        pushNotification,
        dismissNotification,
        clearNotifications,
        markAllRead,
        doNotDisturb,
        setDoNotDisturb,
        toggleDoNotDisturb,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
