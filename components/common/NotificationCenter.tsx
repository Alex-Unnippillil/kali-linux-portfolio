import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

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

  const orderedNotifications = useMemo(() => {
    return Object.entries(notifications)
      .flatMap(([appId, list]) =>
        list.map(notification => ({
          ...notification,
          appId,
        }))
      )
      .sort((a, b) => a.date - b.date);
  }, [notifications]);

  const hasNotifications = orderedNotifications.length > 0;

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
      <div
        className={`notification-center${hasNotifications ? ' notification-center--visible' : ''}`}
        aria-live="polite"
        aria-atomic="false"
        aria-hidden={hasNotifications ? undefined : true}
      >
        <TransitionGroup component={null}>
          {orderedNotifications.map(notification => (
            <CSSTransition key={notification.id} classNames="notification" timeout={320}>
              <article className="notification-toast" role="status">
                <div className="notification-card">
                  <span className="notification-app" title={notification.appId}>
                    {notification.appId}
                  </span>
                  <p className="notification-message">{notification.message}</p>
                </div>
              </article>
            </CSSTransition>
          ))}
        </TransitionGroup>
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
