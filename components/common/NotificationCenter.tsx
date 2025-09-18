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
  muted: boolean;
  setMuted: (value: boolean) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const [muted, setMuted] = useState(false);

  const pushNotification = useCallback((appId: string, message: string) => {
    if (muted) return;
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
  }, [muted]);

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
      value={{ notifications, pushNotification, clearNotifications, muted, setMuted }}
    >
      {children}
      <div className="notification-center">
        {muted && (
          <div className="notification-muted" role="status">
            Notifications muted for presentation mode
          </div>
        )}
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
