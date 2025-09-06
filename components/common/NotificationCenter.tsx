"use client";

import React, { createContext, useCallback, useEffect, useState } from 'react';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  pushNotification: (message: string) => void;
  clearNotifications: () => void;
  doNotDisturb: boolean;
  toggleDoNotDisturb: () => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  const pushNotification = useCallback((message: string) => {
    setNotifications(prev => {
      const next = [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, message, date: Date.now() },
      ];
      return next.slice(-50);
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleDoNotDisturb = useCallback(() => {
    setDoNotDisturb(prev => !prev);
  }, []);

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (notifications.length > 0) nav.setAppBadge(notifications.length).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [notifications]);

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
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
