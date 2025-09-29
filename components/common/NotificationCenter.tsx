import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSettings } from '../../hooks/useSettings';
import {
  DEFAULT_REDACTION_MESSAGE,
  maskSensitiveContent,
} from '../../utils/notificationPrivacy';

export interface AppNotification {
  id: string;
  appId: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
  rawTitle?: string;
  rawBody?: string;
}

export interface PushNotificationInput {
  appId: string;
  title: string;
  body?: string;
  timestamp?: number;
}

interface NotificationsContextValue {
  notificationsByApp: Record<string, AppNotification[]>;
  notifications: AppNotification[];
  unreadCount: number;
  pushNotification: (input: PushNotificationInput) => string;
  dismissNotification: (appId: string, id: string) => void;
  clearNotifications: (appId?: string) => void;
  markAllRead: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const createId = () => `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type InternalNotification = AppNotification & { rawTitle: string; rawBody?: string };

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notificationsByApp, setNotificationsByApp] = useState<
    Record<string, InternalNotification[]>
  >({});
  const {
    notificationPrivacyMode,
    notificationShowPreview,
  } = useSettings();

  const applyPrivacy = useCallback(
    (notification: InternalNotification): InternalNotification => {
      const sanitizedTitle = notificationPrivacyMode
        ? maskSensitiveContent(notification.rawTitle) || ''
        : notification.rawTitle;
      let sanitizedBody: string | undefined;
      if (notification.rawBody === undefined) {
        sanitizedBody = undefined;
      } else if (!notificationPrivacyMode) {
        sanitizedBody = notification.rawBody;
      } else if (!notificationShowPreview) {
        sanitizedBody = DEFAULT_REDACTION_MESSAGE;
      } else {
        sanitizedBody = maskSensitiveContent(notification.rawBody) ?? '';
      }

      if (
        sanitizedTitle === notification.title &&
        sanitizedBody === notification.body
      ) {
        return notification;
      }

      return {
        ...notification,
        title: sanitizedTitle,
        body: sanitizedBody,
      };
    },
    [notificationPrivacyMode, notificationShowPreview],
  );

  const pushNotification = useCallback((input: PushNotificationInput) => {
    const id = createId();
    const timestamp = input.timestamp ?? Date.now();
    setNotificationsByApp(prev => {
      const list = prev[input.appId] ?? [];
      const nextNotification: InternalNotification = {
        id,
        appId: input.appId,
        title: input.title,
        body: input.body,
        rawTitle: input.title,
        rawBody: input.body,
        timestamp,
        read: false,
      };

      return {
        ...prev,
        [input.appId]: [applyPrivacy(nextNotification), ...list],
      };
    });

    return id;
  }, [applyPrivacy]);

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
  }, []);

  const clearNotifications = useCallback((appId?: string) => {
    if (!appId) {
      setNotificationsByApp({});
      return;
    }

    setNotificationsByApp(prev => {
      if (!(appId in prev)) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
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
      const next: Record<string, InternalNotification[]> = {};
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

  useEffect(() => {
    setNotificationsByApp(prev => {
      let mutated = false;
      const next: Record<string, InternalNotification[]> = {};
      Object.entries(prev).forEach(([appId, list]) => {
        const transformed = list.map(notification => applyPrivacy(notification));
        if (!mutated) {
          mutated = transformed.some((notification, index) => notification !== list[index]);
        }
        next[appId] = transformed;
      });
      return mutated ? next : prev;
    });
  }, [applyPrivacy]);

  const notifications = useMemo(
    () =>
      Object.values(notificationsByApp)
        .flat()
        .sort((a, b) => b.timestamp - a.timestamp),
    [notificationsByApp],
  );

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
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
