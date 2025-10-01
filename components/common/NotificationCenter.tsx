import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import {
  ClassificationResult,
  NotificationHints,
  NotificationPriority,
  classifyNotification,
} from '../../utils/notifications/ruleEngine';

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

export interface QuietHoursConfig {
  enabled: boolean;
  start: string;
  end: string;
}

export type NotificationMutingReason = 'do-not-disturb' | 'quiet-hours' | 'both' | null;

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
  doNotDisturb: boolean;
  setDoNotDisturb: React.Dispatch<React.SetStateAction<boolean>>;
  quietHours: QuietHoursConfig;
  setQuietHours: React.Dispatch<React.SetStateAction<QuietHoursConfig>>;
  quietHoursActive: boolean;
  notificationsMuted: boolean;
  mutingReason: NotificationMutingReason;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const createId = () => `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const defaultQuietHours: QuietHoursConfig = {
  enabled: false,
  start: '22:00',
  end: '07:00',
};

const isValidTime = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);

const quietHoursValidator = (value: unknown): value is QuietHoursConfig => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.enabled === 'boolean' &&
    isValidTime(candidate.start) &&
    isValidTime(candidate.end)
  );
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const isQuietHoursActive = (config: QuietHoursConfig, reference: Date): boolean => {
  if (!config.enabled) return false;
  if (config.start === config.end) return false;
  const currentMinutes = reference.getHours() * 60 + reference.getMinutes();
  const startMinutes = timeToMinutes(config.start);
  const endMinutes = timeToMinutes(config.end);

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return false;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [doNotDisturb, setDoNotDisturb] = usePersistentState<boolean>(
    'notifications/dnd',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [quietHours, setQuietHours] = usePersistentState<QuietHoursConfig>(
    'notifications/quiet-hours',
    defaultQuietHours,
    quietHoursValidator,
  );
  const [now, setNow] = useState<number>(() => Date.now());
  const [notificationsByApp, setNotificationsByApp] = useState<
    Record<string, AppNotification[]>
  >({});

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateNow = () => setNow(Date.now());
    const interval = window.setInterval(updateNow, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const referenceTime = useMemo(() => new Date(now), [now]);
  const quietHoursActive = useMemo(
    () => isQuietHoursActive(quietHours, referenceTime),
    [quietHours, referenceTime],
  );

  const notificationsMuted = doNotDisturb || quietHoursActive;

  const mutingReason = useMemo<NotificationMutingReason>(() => {
    if (!notificationsMuted) return null;
    if (doNotDisturb && quietHoursActive) return 'both';
    if (doNotDisturb) return 'do-not-disturb';
    if (quietHoursActive) return 'quiet-hours';
    return null;
  }, [doNotDisturb, notificationsMuted, quietHoursActive]);

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
        hints: input.hints,
        classification,
      };

      return {
        ...prev,
        [input.appId]: [nextNotification, ...list],
      };
    });

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
        doNotDisturb,
        setDoNotDisturb,
        quietHours,
        setQuietHours,
        quietHoursActive,
        notificationsMuted,
        mutingReason,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
