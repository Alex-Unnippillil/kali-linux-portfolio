import React, { createContext, useCallback, useEffect, useState } from 'react';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  /** Do not disturb mode prevents any notifications from being added */
  dnd: boolean;
  /** Map of appId to whether notifications are muted */
  muted: Record<string, boolean>;
  pushNotification: (appId: string, message: string) => void;
  clearNotifications: (appId?: string) => void;
  toggleDnd: () => void;
  toggleApp: (appId: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const [dnd, setDnd] = useState(false);
  const [muted, setMuted] = useState<Record<string, boolean>>({});

  const toggleDnd = useCallback(() => setDnd(v => !v), []);
  const toggleApp = useCallback((appId: string) => {
    setMuted(prev => ({ ...prev, [appId]: !prev[appId] }));
  }, []);

  const pushNotification = useCallback(
    (appId: string, message: string) => {
      setNotifications(prev => {
        if (dnd || muted[appId]) return prev;
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
    },
    [dnd, muted]
  );

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
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, dnd, muted, pushNotification, clearNotifications, toggleDnd, toggleApp }}
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
