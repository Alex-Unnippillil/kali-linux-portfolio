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
  doNotDisturb: boolean;
  toggleDoNotDisturb: () => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<
    Record<string, AppNotification[]>
  >({});
  const [toasts, setToasts] = useState<
    (AppNotification & { appId: string })[]
  >([]);
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  const pushNotification = useCallback(
    (appId: string, message: string) => {
      const notif: AppNotification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        date: Date.now(),
      };
      setNotifications(prev => {
        const list = prev[appId] ?? [];
        return { ...prev, [appId]: [...list, notif] };
      });
      if (!doNotDisturb) {
        const toast = { ...notif, appId };
        setToasts(t => [...t, toast]);
        setTimeout(() => {
          setToasts(t => t.filter(to => to.id !== toast.id));
        }, 3000);
      }
    },
    [doNotDisturb]
  );

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications(prev => {
      if (!appId) return {};
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const toggleDoNotDisturb = useCallback(
    () => setDoNotDisturb(d => !d),
    []
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
      value={{
        notifications,
        pushNotification,
        clearNotifications,
        doNotDisturb,
        toggleDoNotDisturb,
      }}
    >
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 text-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className="bg-black bg-opacity-80 text-white px-3 py-2 rounded"
          >
            {t.message}
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
