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
  announce: (message: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const createId = () => `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const ANNOUNCEMENT_MIN_SPACING_MS = 900;
export const ANNOUNCEMENT_RESET_DELAY_MS = 80;

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notificationsByApp, setNotificationsByApp] = useState<
    Record<string, AppNotification[]>
  >({});
  const [announcementQueue, setAnnouncementQueue] = useState<string[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const lastAnnouncedRef = useRef(0);
  const processingRef = useRef(false);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAnnouncementTimers = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    processingRef.current = false;
  }, []);

  useEffect(() => () => clearAnnouncementTimers(), [clearAnnouncementTimers]);

  useEffect(() => {
    if (!announcementQueue.length) return;
    if (processingRef.current) return;

    const nextMessage = announcementQueue[0];
    processingRef.current = true;
    const now = Date.now();
    const spacingDelay = Math.max(
      0,
      ANNOUNCEMENT_MIN_SPACING_MS - (now - lastAnnouncedRef.current),
    );

    startTimerRef.current = setTimeout(() => {
      setLiveAnnouncement('');
      startTimerRef.current = null;
      flushTimerRef.current = setTimeout(() => {
        setLiveAnnouncement(nextMessage);
        lastAnnouncedRef.current = Date.now();
        processingRef.current = false;
        flushTimerRef.current = null;
        setAnnouncementQueue(prev => prev.slice(1));
      }, ANNOUNCEMENT_RESET_DELAY_MS);
    }, spacingDelay);
  }, [announcementQueue]);

  const announce = useCallback((message: string) => {
    if (typeof message !== 'string') return;
    const normalized = message.trim();
    if (!normalized) return;
    setAnnouncementQueue(prev => [...prev, normalized]);
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
        announce,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
