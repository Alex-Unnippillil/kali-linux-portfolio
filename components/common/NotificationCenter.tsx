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
import { safeLocalStorage } from '../../utils/safeStorage';

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

export interface QuietHoursSettings {
  enabled: boolean;
  start: string;
  end: string;
}

type SetQuietHours = (
  update: QuietHoursSettings | ((prev: QuietHoursSettings) => QuietHoursSettings),
) => void;

interface PendingNotification extends PushNotificationInput {
  id: string;
  timestamp: number;
}

interface NotificationsContextValue {
  notificationsByApp: Record<string, AppNotification[]>;
  notifications: AppNotification[];
  unreadCount: number;
  pushNotification: (input: PushNotificationInput) => string;
  dismissNotification: (appId: string, id: string) => void;
  clearNotifications: (appId?: string) => void;
  markAllRead: (appId?: string) => void;
  quietHours: QuietHoursSettings;
  setQuietHours: SetQuietHours;
  doNotDisturb: boolean;
  setDoNotDisturb: (value: boolean) => void;
  quietModeActive: boolean;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const createId = () => `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const QUIET_HOURS_STORAGE_KEY = 'notifications:quiet-hours';
const DND_STORAGE_KEY = 'notifications:dnd';

const DEFAULT_QUIET_HOURS: QuietHoursSettings = {
  enabled: false,
  start: '22:00',
  end: '07:00',
};

const parseTimeToMinutes = (value: string): number | null => {
  if (typeof value !== 'string') return null;
  const [hourString, minuteString] = value.split(':');
  const hours = Number(hourString);
  const minutes = Number(minuteString);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notificationsByApp, setNotificationsByApp] = useState<
    Record<string, AppNotification[]>
  >({});

  const [, setQueuedNotifications] = useState<PendingNotification[]>([]);

  const [quietHoursState, setQuietHoursState] = useState<QuietHoursSettings>(() => {
    if (!safeLocalStorage) return DEFAULT_QUIET_HOURS;
    try {
      const stored = safeLocalStorage.getItem(QUIET_HOURS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<QuietHoursSettings> | null;
        if (
          parsed &&
          typeof parsed.start === 'string' &&
          typeof parsed.end === 'string'
        ) {
          return {
            enabled: Boolean(parsed.enabled),
            start: parsed.start,
            end: parsed.end,
          };
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return DEFAULT_QUIET_HOURS;
  });

  const [doNotDisturbState, setDoNotDisturbState] = useState<boolean>(() => {
    if (!safeLocalStorage) return false;
    try {
      const stored = safeLocalStorage.getItem(DND_STORAGE_KEY);
      if (stored != null) {
        return JSON.parse(stored) === true;
      }
    } catch {
      // Ignore storage read errors
    }
    return false;
  });

  const quietHours = quietHoursState;
  const doNotDisturb = doNotDisturbState;

  const shouldDeferNotification = useCallback(
    (nowMs: number = Date.now()) => {
      if (doNotDisturb) return true;
      if (!quietHours.enabled) return false;
      const startMinutes = parseTimeToMinutes(quietHours.start);
      const endMinutes = parseTimeToMinutes(quietHours.end);
      if (startMinutes === null || endMinutes === null) return false;
      if (startMinutes === endMinutes) return false;

      const currentDate = new Date(nowMs);
      const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

      if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }

      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    },
    [doNotDisturb, quietHours],
  );

  const [isQuietMode, setIsQuietMode] = useState<boolean>(() => shouldDeferNotification());

  const deliverNotification = useCallback(
    (pending: PendingNotification) => {
      const classification = classifyNotification({
        appId: pending.appId,
        title: pending.title,
        body: pending.body,
        priority: pending.priority,
        hints: pending.hints,
      });

      setNotificationsByApp(prev => {
        const list = prev[pending.appId] ?? [];
        const nextNotification: AppNotification = {
          id: pending.id,
          appId: pending.appId,
          title: pending.title,
          body: pending.body,
          timestamp: pending.timestamp,
          read: false,
          priority: classification.priority,
          hints: pending.hints,
          classification,
        };

        return {
          ...prev,
          [pending.appId]: [nextNotification, ...list],
        };
      });
    },
    [setNotificationsByApp],
  );

  const pushNotification = useCallback(
    (input: PushNotificationInput) => {
      const id = createId();
      const timestamp = input.timestamp ?? Date.now();
      const pending: PendingNotification = {
        ...input,
        id,
        timestamp,
      };

      if (shouldDeferNotification(timestamp)) {
        setQueuedNotifications(prev => [...prev, pending]);
      } else {
        deliverNotification(pending);
      }

      return id;
    },
    [deliverNotification, shouldDeferNotification],
  );

  const releaseQueuedNotifications = useCallback(() => {
    setQueuedNotifications(prev => {
      if (prev.length === 0) return prev;
      if (shouldDeferNotification()) return prev;

      prev.forEach(deliverNotification);
      return [];
    });
  }, [deliverNotification, shouldDeferNotification]);

  const setQuietHours = useCallback<SetQuietHours>(
    update => {
      setQuietHoursState(prev => {
        const next = typeof update === 'function' ? update(prev) : update;
        if (
          next.enabled === prev.enabled &&
          next.start === prev.start &&
          next.end === prev.end
        ) {
          return prev;
        }
        if (safeLocalStorage) {
          safeLocalStorage.setItem(QUIET_HOURS_STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
  );

  const setDoNotDisturb = useCallback(
    (value: boolean) => {
      setDoNotDisturbState(prev => {
        if (prev === value) return prev;
        if (safeLocalStorage) {
          safeLocalStorage.setItem(DND_STORAGE_KEY, JSON.stringify(value));
        }
        return value;
      });
    },
    [],
  );

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
    if (typeof window === 'undefined') {
      setIsQuietMode(shouldDeferNotification());
      if (!shouldDeferNotification()) {
        releaseQueuedNotifications();
      }
      return;
    }

    const tick = () => {
      const quiet = shouldDeferNotification();
      setIsQuietMode(quiet);
      if (!quiet) {
        releaseQueuedNotifications();
      }
    };

    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [releaseQueuedNotifications, shouldDeferNotification]);

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
        quietHours,
        setQuietHours,
        doNotDisturb,
        setDoNotDisturb,
        quietModeActive: isQuietMode,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
