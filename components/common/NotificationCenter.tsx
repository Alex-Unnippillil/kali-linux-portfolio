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
import usePersistentState from '../../hooks/usePersistentState';
import Toast from '../ui/Toast';

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
  isDoNotDisturb: boolean;
  setDoNotDisturb: (value: boolean) => void;
  toggleDoNotDisturb: () => void;
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
  const [doNotDisturb, setDoNotDisturbState] = usePersistentState<boolean>(
    'qs-dnd',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const dndRef = useRef(doNotDisturb);
  const [toastQueue, setToastQueue] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  useEffect(() => {
    dndRef.current = doNotDisturb;
  }, [doNotDisturb]);

  const setDoNotDisturb = useCallback((value: boolean) => {
    setDoNotDisturbState(value);
  }, [setDoNotDisturbState]);

  const toggleDoNotDisturb = useCallback(() => {
    setDoNotDisturbState(prev => !prev);
  }, [setDoNotDisturbState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('notification-dnd-change', {
        detail: { enabled: doNotDisturb },
      }),
    );
  }, [doNotDisturb]);

  useEffect(() => {
    if (doNotDisturb) {
      setToastQueue([]);
      setActiveToast(null);
    }
  }, [doNotDisturb]);

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
    };

    setNotificationsByApp(prev => {
      const list = prev[input.appId] ?? [];

      return {
        ...prev,
        [input.appId]: [nextNotification, ...list],
      };
    });

    if (!dndRef.current) {
      setToastQueue(prev => [...prev, nextNotification]);
    }

    return id;
  }, []);

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
    if (doNotDisturb) return;
    if (activeToast) return;
    if (toastQueue.length === 0) return;

    setActiveToast(toastQueue[0]);
    setToastQueue(prev => prev.slice(1));
  }, [activeToast, toastQueue, doNotDisturb]);

  const handleToastClose = useCallback(() => {
    setActiveToast(null);
  }, []);

  const handleToastAction = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('notification-center-open-request'));
  }, []);

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
        isDoNotDisturb: doNotDisturb,
        setDoNotDisturb,
        toggleDoNotDisturb,
      }}
    >
      {children}
      {!doNotDisturb && activeToast && (
        <Toast
          key={activeToast.id}
          message={`${activeToast.appId}: ${activeToast.title}${
            activeToast.body ? ` — ${activeToast.body}` : ''
          }`}
          actionLabel="View"
          onAction={() => {
            handleToastAction();
            handleToastClose();
          }}
          onClose={handleToastClose}
        />
      )}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
