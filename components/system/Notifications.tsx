import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
}

type NotificationMap = Record<string, AppNotification[]>;

export type IndicatorState = 'idle' | 'active' | 'dnd' | 'muted';

export interface NotificationsContextValue {
  notifications: NotificationMap;
  pushNotification: (appId: string, message: string) => void;
  clearNotifications: (appId?: string) => void;
  doNotDisturb: boolean;
  setDoNotDisturb: (
    value: boolean | ((previous: boolean) => boolean),
  ) => void;
  indicator: IndicatorState;
}

const STORAGE_KEY = 'system-dnd-enabled';

const readInitialDnd = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to read DND preference', error);
    return false;
  }
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

const updateAppBadge = (count: number) => {
  if (typeof navigator === 'undefined') return;
  const nav: any = navigator;
  if (count > 0) {
    nav.setAppBadge?.(count)?.catch?.(() => {});
  } else {
    nav.clearAppBadge?.()?.catch?.(() => {});
  }
};

export const NotificationsProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationMap>({});
  const [doNotDisturb, setDoNotDisturbState] = useState<boolean>(readInitialDnd);

  const pushNotification = useCallback((appId: string, message: string) => {
    setNotifications(prev => {
      const list = prev[appId] ?? [];
      const entry: AppNotification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        date: Date.now(),
      };
      return {
        ...prev,
        [appId]: [...list, entry],
      };
    });
  }, []);

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications(prev => {
      if (!appId) return {};
      if (!prev[appId]) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const totalCount = useMemo(
    () => Object.values(notifications).reduce((sum, list) => sum + list.length, 0),
    [notifications],
  );

  useEffect(() => {
    updateAppBadge(totalCount);
  }, [totalCount]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, doNotDisturb ? 'true' : 'false');
      } catch (error) {
        console.warn('Failed to persist DND preference', error);
      }
      window.dispatchEvent(
        new CustomEvent('system:dnd-change', { detail: { enabled: doNotDisturb } }),
      );
    }
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.dnd = doNotDisturb ? 'true' : 'false';
    }
  }, [doNotDisturb]);

  const indicator = useMemo<IndicatorState>(() => {
    if (doNotDisturb) {
      return totalCount > 0 ? 'muted' : 'dnd';
    }
    return totalCount > 0 ? 'active' : 'idle';
  }, [doNotDisturb, totalCount]);

  const setDoNotDisturb = useCallback<
    NotificationsContextValue['setDoNotDisturb']
  >((value) => {
    setDoNotDisturbState(prev =>
      typeof value === 'function' ? value(prev) : value,
    );
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      pushNotification,
      clearNotifications,
      doNotDisturb,
      setDoNotDisturb,
      indicator,
    }),
    [
      notifications,
      pushNotification,
      clearNotifications,
      doNotDisturb,
      setDoNotDisturb,
      indicator,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="notification-center">
        {Object.entries(notifications).map(([appId, list]) => (
          <section key={appId} className="notification-group">
            <h3>{appId}</h3>
            <ul>
              {list.map(notification => (
                <li key={notification.id}>{notification.message}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
