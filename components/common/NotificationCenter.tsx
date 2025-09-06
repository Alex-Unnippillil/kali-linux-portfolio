import React, { createContext, useCallback, useState } from 'react';
import NotificationsPanel from '../ui/NotificationsPanel';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  pushNotification: (message: string) => void;
  clearNotifications: () => void;
  dnd: boolean;
  toggleDnd: () => void;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dnd, setDnd] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const pushNotification = useCallback((message: string) => {
    setNotifications(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, message, date: Date.now() },
    ]);
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  const toggleDnd = useCallback(() => setDnd(prev => !prev), []);
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <NotificationsContext.Provider
      value={{ notifications, pushNotification, clearNotifications, dnd, toggleDnd, panelOpen, openPanel, closePanel }}
    >
      {children}
      <NotificationsPanel open={panelOpen} notifications={notifications} onClose={closePanel} />
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
