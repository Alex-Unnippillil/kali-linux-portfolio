import React, { createContext, useCallback, useEffect, useState } from 'react';

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

  const pushNotification = useCallback((appId: string, message: string) => {
    setNotifications(prev => {
      const list = prev[appId] ?? [];
      const next = {
        ...prev,
        [appId]: [
          ...list,
          {
            id: `${Date.now()}-${Math.random()}`,
            message,
            date: Date.now(),
          },
        ],
      };
      return next;
    });
  }, []);

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications(prev => {
      if (!appId) return {};
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const totalCount = Object.values(notifications).reduce(
    (sum, list) => sum + list.length,
    0
  );

  useEffect(() => {
    const nav: any = typeof navigator === 'undefined' ? null : navigator;
    const hasSet = !!nav?.setAppBadge;
    const hasClear = !!nav?.clearAppBadge;

    const cleanTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = document.title.replace(/^\(\d+\)\s*/, '');
      }
    };

    if (hasSet || hasClear) {
      if (totalCount > 0 && hasSet) nav.setAppBadge(totalCount).catch(() => {});
      else if (hasClear) nav.clearAppBadge().catch(() => {});
      cleanTitle();
    } else if (typeof document !== 'undefined') {
      cleanTitle();
      if (totalCount > 0) {
        document.title = `(${totalCount}) ${document.title}`;
      }
    }
  }, [totalCount]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, pushNotification, clearNotifications }}
    >
      {children}
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
