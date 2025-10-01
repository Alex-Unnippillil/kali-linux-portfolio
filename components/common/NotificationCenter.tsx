import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ClassificationResult,
  NotificationHints,
  NotificationPriority,
  classifyNotification,
} from '../../utils/notifications/ruleEngine';
import { recordLog } from '../../utils/dev/reproRecorder';
import type { SerializedNotification } from '../../utils/dev/reproBundle';

export type {
  ClassificationResult,
  NotificationHints,
  NotificationPriority,
} from '../../utils/notifications/ruleEngine';

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
}

export interface PushNotificationInput {
  appId: string;
  title: string;
  body?: string;
  timestamp?: number;
  priority?: NotificationPriority;
  hints?: NotificationHints;
}

interface NotificationsContextValue {
  notificationsByApp: Record<string, AppNotification[]>;
  notifications: AppNotification[];
  unreadCount: number;
  pushNotification: (input: PushNotificationInput) => string;
  dismissNotification: (appId: string, id: string) => void;
  clearNotifications: (appId?: string) => void;
  markAllRead: (appId?: string) => void;
  hydrateNotifications: (snapshot: Record<string, SerializedNotification[]>) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const createId = () => `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notificationsByApp, setNotificationsByApp] = useState<
    Record<string, AppNotification[]>
  >({});

  const ensurePlainObject = useCallback((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return value as Record<string, unknown>;
  }, []);

  const pushNotification = useCallback((input: PushNotificationInput) => {
    const id = createId();
    const timestamp = input.timestamp ?? Date.now();
    const classification = classifyNotification({
      appId: input.appId,
      title: input.title,
      body: input.body,
      priority: input.priority,
      hints: input.hints,
    });
    setNotificationsByApp(prev => {
      const list = prev[input.appId] ?? [];
      const nextNotification: AppNotification = {
        id,
        appId: input.appId,
        title: input.title,
        body: input.body,
        timestamp,
        read: false,
        priority: classification.priority,
        hints: input.hints ? ensurePlainObject(input.hints) : undefined,
        classification,
      };

      return {
        ...prev,
        [input.appId]: [nextNotification, ...list],
      };
    });
    recordLog('info', 'notifications:push', {
      appId: input.appId,
      title: input.title,
      priority: input.priority ?? classification.priority,
    });

    return id;
  }, [ensurePlainObject]);

  const dismissNotification = useCallback((appId: string, id: string) => {
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
    recordLog('info', 'notifications:dismiss', { appId, id });
  }, []);

  const clearNotifications = useCallback((appId?: string) => {
    if (!appId) {
      setNotificationsByApp({});
      recordLog('info', 'notifications:clear-all', {});
      return;
    }

    setNotificationsByApp(prev => {
      if (!(appId in prev)) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    recordLog('info', 'notifications:clear', { appId });
  }, []);

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
    recordLog('info', 'notifications:mark-read', { appId: appId ?? 'all' });
  }, []);

  const hydrateNotifications = useCallback(
    (snapshot: Record<string, SerializedNotification[]>) => {
      setNotificationsByApp(() => {
        const next: Record<string, AppNotification[]> = {};
        Object.entries(snapshot).forEach(([appId, list]) => {
          if (!Array.isArray(list)) return;
          next[appId] = list.map((notification) => {
            const title = typeof notification.title === 'string' ? notification.title : '';
            const body = notification.body ? String(notification.body) : undefined;
            const hints = notification.hints ? ensurePlainObject(notification.hints) : undefined;
            const base: AppNotification = {
              id: notification.id ?? createId(),
              appId,
              title,
              body,
              timestamp:
                typeof notification.timestamp === 'number' && Number.isFinite(notification.timestamp)
                  ? notification.timestamp
                  : Date.now(),
              read: Boolean(notification.read),
              priority: notification.priority ?? 'normal',
              hints,
              classification: notification.classification
                ? {
                    priority: notification.classification.priority,
                    matchedRuleId: notification.classification.matchedRuleId,
                    source: notification.classification.source,
                  }
                : classifyNotification({
                    appId,
                    title,
                    body,
                    priority: notification.priority,
                    hints,
                  }),
            };
            return base;
          });
        });
        return next;
      });
      recordLog('info', 'notifications:hydrate', { apps: Object.keys(snapshot).length });
    },
    [ensurePlainObject],
  );

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

  return (
    <NotificationsContext.Provider
      value={{
        notificationsByApp,
        notifications,
        unreadCount,
        pushNotification,
        dismissNotification,
        clearNotifications,
        markAllRead,
        hydrateNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
