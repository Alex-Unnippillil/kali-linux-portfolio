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
      <aside
        className="notification-center"
        role="region"
        aria-label="Notification center"
        aria-live="polite"
        aria-atomic="false"
      >
        <h2 id="notification-center-heading" className="sr-only">
          Notification center
        </h2>
        <p className="sr-only" aria-live="polite">
          {totalCount === 0
            ? 'No notifications'
            : `${totalCount} notification${totalCount === 1 ? '' : 's'} available`}
        </p>
        {Object.entries(notifications).map(([appId, list]) => (
          <section
            key={appId}
            className="notification-group"
            role="group"
            aria-labelledby={`notifications-${appId}`}
          >
            <h3 id={`notifications-${appId}`}>{appId}</h3>
            <ul role="list">
              {list.map(n => (
                <li key={n.id} role="listitem">{n.message}</li>
              ))}
            </ul>
          </section>
        ))}
      </aside>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
