import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Toast from '../ui/Toast';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (appId: string, message: string) => void;
  clearNotifications: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const [visibleToasts, setVisibleToasts] = useState<(AppNotification & { appId: string })[]>([]);
  const queueRef = useRef<(AppNotification & { appId: string })[]>([]);

  const fillVisibleToasts = useCallback(
    (current: (AppNotification & { appId: string })[]) => {
      let next = [...current];
      while (next.length < 4 && queueRef.current.length > 0) {
        const toast = queueRef.current.shift();
        if (toast) {
          next = [...next, toast];
        }
      }
      return next;
    },
    [],
  );

  const pushNotification = useCallback((appId: string, message: string) => {
    const now = Date.now();
    const toast = {
      id: `${now}-${Math.random()}`,
      message,
      date: now,
      appId,
    };
    setNotifications(prev => {
      const list = prev[appId] ?? [];
      const next = {
        ...prev,
        [appId]: [...list, { id: toast.id, message, date: toast.date }],
      };
      return next;
    });
    setVisibleToasts(prev => {
      if (prev.length >= 4) {
        queueRef.current = [...queueRef.current, toast];
        return prev;
      }
      return [...prev, toast];
    });
  }, []);

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications(prev => {
      if (!appId) return {};
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    if (!appId) {
      queueRef.current = [];
      setVisibleToasts([]);
      return;
    }
    queueRef.current = queueRef.current.filter(toast => toast.appId !== appId);
    setVisibleToasts(prev => fillVisibleToasts(prev.filter(toast => toast.appId !== appId)));
  }, [fillVisibleToasts]);

  const dismissToast = useCallback(
    (id: string) => {
      setVisibleToasts(prev => fillVisibleToasts(prev.filter(toast => toast.id !== id)));
    },
    [fillVisibleToasts],
  );

  const totalCount = Object.values(notifications).reduce(
    (sum, list) => sum + list.length,
    0
  );

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, pushNotification, clearNotifications }}
    >
      {children}
      {visibleToasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex flex-col gap-2">
          {visibleToasts.map(toast => (
            <Toast
              key={toast.id}
              id={toast.id}
              message={toast.message}
              appId={toast.appId}
              onDismiss={dismissToast}
              duration={5000}
            />
          ))}
        </div>
      )}
      <div className="notification-center">
        {Object.entries(notifications).map(([appId, list]) => (
          <section key={appId} className="notification-group">
            <h3>{appId}</h3>
            <ul>
              {list.map(n => (
                <li key={n.id}>{n.message}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
