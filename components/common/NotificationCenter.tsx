import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ClassificationResult,
  NotificationHints,
  NotificationPriority,
  classifyNotification,
} from '../../utils/notifications/ruleEngine';
import NotificationCard from './notifications/NotificationCard';
import {
  createNotificationTimeFormatter,
  formatNotifications,
  type FormattedNotification,
} from './notifications/primitives';

export type {
  ClassificationResult,
  NotificationHints,
  NotificationPriority,
} from '../../utils/notifications/ruleEngine';

export type NotificationChannel = 'center' | 'toast';

export interface AppNotification {
  id: string;
  appId: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
  priority: NotificationPriority;
  hints?: NotificationHints;
  classification: ClassificationResult;
  channels: NotificationChannel[];
  autoDismissMs?: number | null;
}

export interface PushNotificationInput {
  appId: string;
  title: string;
  body?: string;
  timestamp?: number;
  priority?: NotificationPriority;
  hints?: NotificationHints;
  mode?: 'center' | 'toast' | 'both';
  autoDismissMs?: number | null;
}

interface NotificationsContextValue {
  notificationsByApp: Record<string, AppNotification[]>;
  notifications: AppNotification[];
  toastNotifications: AppNotification[];
  unreadCount: number;
  pushNotification: (input: PushNotificationInput) => string;
  dismissNotification: (
    appId: string,
    id: string,
    options?: { target?: 'center' | 'toast' | 'both' },
  ) => void;
  clearNotifications: (appId?: string) => void;
  markAllRead: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const createId = () => `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const DEFAULT_TOAST_DISMISS_MS = 6000;

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notificationsByApp, setNotificationsByApp] = useState<
    Record<string, AppNotification[]>
  >({});
  const [toastNotifications, setToastNotifications] = useState<AppNotification[]>([]);
  const toastTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const clearToastTimer = useCallback((id: string) => {
    const timer = toastTimers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete toastTimers.current[id];
    }
  }, []);

  const dismissNotification = useCallback(
    (appId: string, id: string, options?: { target?: 'center' | 'toast' | 'both' }) => {
      const target = options?.target ?? 'both';

      if (target === 'toast' || target === 'both') {
        setToastNotifications(prev => {
          const filtered = prev.filter(notification => notification.id !== id);
          return filtered.length === prev.length ? prev : filtered;
        });
        clearToastTimer(id);
      }

      if (target === 'center' || target === 'both') {
        setNotificationsByApp(prev => {
          const list = prev[appId];
          if (!list) return prev;
          const filtered = list.filter(notification => notification.id !== id);
          if (filtered.length === list.length) return prev;

          const next = { ...prev };
          if (filtered.length > 0) next[appId] = filtered;
          else delete next[appId];
          return next;
        });
      }
    },
    [clearToastTimer],
  );

  const pushNotification = useCallback(
    (input: PushNotificationInput) => {
      const id = createId();
      const timestamp = input.timestamp ?? Date.now();
      const classification = classifyNotification({
        appId: input.appId,
        title: input.title,
        body: input.body,
        priority: input.priority,
        hints: input.hints,
      });

      const mode = input.mode ?? 'center';
      const channels: NotificationChannel[] =
        mode === 'both'
          ? ['center', 'toast']
          : mode === 'toast'
          ? ['toast']
          : ['center'];

      const autoDismissMs =
        input.autoDismissMs === null
          ? null
          : input.autoDismissMs ?? (channels.includes('toast') ? DEFAULT_TOAST_DISMISS_MS : undefined);

      const nextNotification: AppNotification = {
        id,
        appId: input.appId,
        title: input.title,
        body: input.body,
        timestamp,
        read: false,
        priority: classification.priority,
        hints: input.hints,
        classification,
        channels,
        autoDismissMs,
      };

      if (channels.includes('center')) {
        setNotificationsByApp(prev => {
          const list = prev[input.appId] ?? [];
          return {
            ...prev,
            [input.appId]: [nextNotification, ...list],
          };
        });
      }

      if (channels.includes('toast')) {
        setToastNotifications(prev => [nextNotification, ...prev]);
        if (typeof autoDismissMs === 'number' && autoDismissMs > 0) {
          toastTimers.current[id] = setTimeout(() => {
            dismissNotification(input.appId, id, { target: 'toast' });
          }, autoDismissMs);
        }
      }

      return id;
    },
    [dismissNotification],
  );

  const clearNotifications = useCallback(
    (appId?: string) => {
      if (!appId) {
        setNotificationsByApp({});
        setToastNotifications([]);
        Object.keys(toastTimers.current).forEach(id => clearToastTimer(id));
        return;
      }

      setNotificationsByApp(prev => {
        if (!(appId in prev)) return prev;
        const next = { ...prev };
        delete next[appId];
        return next;
      });

      setToastNotifications(prev => {
        if (!prev.some(notification => notification.appId === appId)) return prev;
        const filtered = prev.filter(notification => notification.appId !== appId);
        prev
          .filter(notification => notification.appId === appId)
          .forEach(notification => clearToastTimer(notification.id));
        return filtered;
      });
    },
    [clearToastTimer],
  );

  const markAllRead = useCallback((appId?: string) => {
    setNotificationsByApp(prev => {
      if (appId) {
        const list = prev[appId];
        if (!list || list.every(notification => notification.read)) return prev;
        return {
          ...prev,
          [appId]: list.map(notification => ({ ...notification, read: true })),
        };
      }

      let changed = false;
      const next: Record<string, AppNotification[]> = {};
      Object.entries(prev).forEach(([key, list]) => {
        const updated = list.map(notification => {
          if (notification.read) return notification;
          changed = true;
          return { ...notification, read: true };
        });
        next[key] = updated;
      });
      return changed ? next : prev;
    });
  }, []);

  const notifications = useMemo(() =>
    Object.values(notificationsByApp)
      .flat()
      .sort((a, b) => {
        const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.timestamp - a.timestamp;
      }),
  [notificationsByApp]);

  const unreadCount = useMemo(
    () => notifications.reduce((sum, notification) => sum + (notification.read ? 0 : 1), 0),
    [notifications],
  );

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (unreadCount > 0) nav.setAppBadge(unreadCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [unreadCount]);

  useEffect(
    () => () => {
      Object.keys(toastTimers.current).forEach(id => clearToastTimer(id));
    },
    [clearToastTimer],
  );

  return (
    <NotificationsContext.Provider
      value={{
        notificationsByApp,
        notifications,
        toastNotifications,
        unreadCount,
        pushNotification,
        dismissNotification,
        clearNotifications,
        markAllRead,
      }}
    >
      {children}
      <ToastViewport
        notifications={toastNotifications}
        onDismiss={(notification, options) =>
          dismissNotification(notification.appId, notification.id, options)
        }
      />
    </NotificationsContext.Provider>
  );
};

const ToastViewport: React.FC<{
  notifications: AppNotification[];
  onDismiss: (
    notification: AppNotification,
    options?: { target?: 'center' | 'toast' | 'both' },
  ) => void;
}> = ({ notifications, onDismiss }) => {
  const timeFormatter = useMemo(() => createNotificationTimeFormatter(), []);
  const formatted = useMemo<FormattedNotification[]>(
    () => formatNotifications(notifications, timeFormatter),
    [notifications, timeFormatter],
  );

  if (formatted.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-3">
      {formatted.map(notification => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          mode="toast"
          onDismiss={() => onDismiss(notification, { target: 'toast' })}
        />
      ))}
    </div>
  );
};

export default NotificationCenter;
