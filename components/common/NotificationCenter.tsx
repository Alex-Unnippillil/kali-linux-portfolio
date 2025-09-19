import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

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

interface NotificationCenterProps {
  children?: React.ReactNode;
  className?: string;
  emptyMessage?: string;
  title?: string;
  showClearAll?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  children,
  className,
  emptyMessage = 'No notifications',
  title,
  showClearAll = true,
}) => {
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

  const grouped = useMemo(() => Object.entries(notifications), [notifications]);
  const hasNotifications = grouped.length > 0;

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  const containerClasses = ['notification-center', 'mt-4', 'space-y-3'];
  if (className) containerClasses.push(className);

  return (
    <NotificationsContext.Provider
      value={{ notifications, pushNotification, clearNotifications }}
    >
      {children}
      <div className={containerClasses.join(' ')}>
        {title && (
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
              {title}
            </h2>
            {hasNotifications && showClearAll && (
              <button
                type="button"
                onClick={() => clearNotifications()}
                className="ml-auto text-xs text-gray-400 hover:text-white focus:outline-none focus:ring-1 focus:ring-white"
              >
                Clear all
              </button>
            )}
          </div>
        )}
        {hasNotifications ? (
          grouped.map(([appId, list]) => (
            <section
              key={appId}
              className="notification-group rounded border border-gray-700 bg-[var(--kali-panel)] p-3 shadow-lg shadow-black/40"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">{appId}</h3>
                <button
                  type="button"
                  onClick={() => clearNotifications(appId)}
                  className="ml-auto text-xs text-gray-400 hover:text-white focus:outline-none focus:ring-1 focus:ring-white"
                >
                  Dismiss
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-white">
                {list.map(n => (
                  <li
                    key={n.id}
                    className="rounded bg-black/40 px-2 py-1 leading-relaxed"
                  >
                    <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                      {new Date(n.date).toLocaleTimeString()}
                    </span>
                    <span>{n.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        )}
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
