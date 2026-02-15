import React, { createContext, useCallback, useContext, useState } from 'react';

export interface Notification {
  id: string;
  message: string;
  date: number;
}

interface NotificationsStore {
  notifications: Notification[];
  /** number of notifications muted while DND is active */
  mutedCount: number;
  /** whether Do Not Disturb mode is active */
  dnd: boolean;
  /** push a new notification; will be muted when DND is on */
  push: (message: string) => void;
  /** remove all notifications and muted items */
  clear: () => void;
  /** toggle DND mode; flushing muted notifications when turning off */
  toggleDnd: () => void;
}

export const NotificationsContext =
  createContext<NotificationsStore | null>(null);

export const NotificationsProvider: React.FC<{ children?: React.ReactNode }>
  = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [muted, setMuted] = useState<Notification[]>([]);
  const [dnd, setDnd] = useState(false);

  const push = useCallback(
    (message: string) => {
      const n: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        date: Date.now(),
      };
      if (dnd) setMuted((prev) => [...prev, n]);
      else setNotifications((prev) => [...prev, n]);
    },
    [dnd]
  );

  const clear = useCallback(() => {
    setNotifications([]);
    setMuted([]);
  }, []);

  const toggleDnd = useCallback(() => {
    setDnd((prev) => {
      const next = !prev;
      if (prev && !next && muted.length > 0) {
        setNotifications((n) => [...n, ...muted]);
        setMuted([]);
      }
      return next;
    });
  }, [muted]);

  const value: NotificationsStore = {
    notifications,
    mutedCount: muted.length,
    dnd,
    push,
    clear,
    toggleDnd,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};

export default NotificationsProvider;
