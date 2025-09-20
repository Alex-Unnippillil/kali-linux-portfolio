import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SummaryBundleList } from '../apps/notifications';
import { SummaryBundle, NotificationAction } from '../apps/notifications/types';
import { useFocusMode } from '../../hooks/useFocusMode';

export interface AppNotification {
  id: string;
  appId: string;
  message: string;
  date: number;
  priority: 'critical' | 'normal';
  actions: NotificationAction[];
  respectFocus: boolean;
}

export interface NotificationActionInput {
  label: string;
  handler: () => void;
}

export interface PushOptions {
  priority?: 'critical' | 'normal';
  actions?: NotificationActionInput[];
  respectFocus?: boolean;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (appId: string, message: string, options?: PushOptions) => void;
  clearNotifications: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const computeNextOccurrence = (times: string[]): number | null => {
  if (!times.length) return null;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const sortedMinutes = times
    .map(time => {
      const [h, m] = time.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (!sortedMinutes.length) return null;
  for (const minutes of sortedMinutes) {
    if (minutes >= nowMinutes) {
      const target = new Date(now);
      target.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      return target.getTime();
    }
  }
  const target = new Date(now);
  target.setDate(target.getDate() + 1);
  const first = sortedMinutes[0];
  target.setHours(Math.floor(first / 60), first % 60, 0, 0);
  return target.getTime();
};

const dedupeActions = (actions: NotificationAction[]): NotificationAction[] => {
  const seen = new Map<string, NotificationAction>();
  actions.forEach(action => {
    if (!seen.has(action.label)) {
      seen.set(action.label, action);
    }
  });
  return Array.from(seen.values());
};

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const {
    enabled,
    getDeliveryPolicy,
    recordSuppressedNotification,
    recordSummaryDelivery,
  } = useFocusMode();
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const [queued, setQueued] = useState<Record<string, AppNotification[]>>({});
  const [bundles, setBundles] = useState<SummaryBundle[]>([]);
  const releaseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const releaseAtRef = useRef<Map<string, number>>(new Map());

  const pushNotification = useCallback(
    (appId: string, message: string, options: PushOptions = {}) => {
      const { priority = 'normal', actions = [], respectFocus = true } = options;
      const timestamp = Date.now();
      const actionEntries: NotificationAction[] = actions.map((action, index) => ({
        id: `${appId}-${timestamp}-${index}-${Math.random().toString(36).slice(2)}`,
        label: action.label,
        handler: action.handler,
      }));

      const notification: AppNotification = {
        id: `${timestamp}-${Math.random().toString(36).slice(2)}`,
        appId,
        message,
        date: timestamp,
        priority,
        actions: actionEntries,
        respectFocus,
      };

      if (!enabled || !respectFocus || priority === 'critical') {
        setNotifications(prev => {
          const list = prev[appId] ?? [];
          return {
            ...prev,
            [appId]: [...list, notification],
          };
        });
        return;
      }

      const policy = getDeliveryPolicy(appId);
      if (policy.mode === 'immediate') {
        setNotifications(prev => {
          const list = prev[appId] ?? [];
          return {
            ...prev,
            [appId]: [...list, notification],
          };
        });
        return;
      }

      if (policy.mode === 'mute') {
        recordSuppressedNotification(appId);
        return;
      }

      recordSuppressedNotification(appId);
      setQueued(prev => {
        const list = prev[appId] ?? [];
        return {
          ...prev,
          [appId]: [...list, notification],
        };
      });
    },
    [enabled, getDeliveryPolicy, recordSuppressedNotification]
  );

  const releaseBundle = useCallback(
    (appId: string) => {
      setQueued(prev => {
        const list = prev[appId];
        if (!list || list.length === 0) return prev;
        const bundle: SummaryBundle = {
          id: `summary-${appId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          appId,
          count: list.length,
          messages: list.map(item => item.message),
          releasedAt: Date.now(),
          actions: dedupeActions(list.flatMap(item => item.actions)),
        };
        setBundles(prevBundles => [...prevBundles, bundle]);
        recordSummaryDelivery(appId, list.length);
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      const timer = releaseTimers.current.get(appId);
      if (timer) {
        clearTimeout(timer);
        releaseTimers.current.delete(appId);
        releaseAtRef.current.delete(appId);
      }
    },
    [recordSummaryDelivery]
  );

  const clearNotifications = useCallback((appId?: string) => {
    if (!appId) {
      setNotifications({});
      setQueued({});
      setBundles([]);
      releaseTimers.current.forEach(timer => clearTimeout(timer));
      releaseTimers.current.clear();
      releaseAtRef.current.clear();
      return;
    }
    setNotifications(prev => {
      if (!prev[appId]) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    setQueued(prev => {
      if (!prev[appId]) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    setBundles(prev => prev.filter(bundle => bundle.appId !== appId));
    const timer = releaseTimers.current.get(appId);
    if (timer) {
      clearTimeout(timer);
      releaseTimers.current.delete(appId);
      releaseAtRef.current.delete(appId);
    }
  }, []);

  const totalCount = useMemo(() => {
    const immediate = Object.values(notifications).reduce(
      (sum, list) => sum + list.length,
      0
    );
    const queuedCount = Object.values(queued).reduce(
      (sum, list) => sum + list.length,
      0
    );
    return immediate + queuedCount;
  }, [notifications, queued]);

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timers = releaseTimers.current;
    const releaseAt = releaseAtRef.current;

    timers.forEach((timer, appId) => {
      const list = queued[appId];
      const policy = getDeliveryPolicy(appId);
      if (!enabled || !list?.length || policy.mode !== 'bundle') {
        clearTimeout(timer);
        timers.delete(appId);
        releaseAt.delete(appId);
      }
    });

    if (!enabled) {
      Object.keys(queued).forEach(appId => {
        if (queued[appId]?.length) {
          releaseBundle(appId);
        }
      });
      return;
    }

    Object.entries(queued).forEach(([appId, list]) => {
      if (!list.length) return;
      const policy = getDeliveryPolicy(appId);
      if (policy.mode !== 'bundle') {
        releaseBundle(appId);
        return;
      }
      const nextRelease = computeNextOccurrence(policy.schedule);
      if (!nextRelease) {
        releaseBundle(appId);
        return;
      }
      const existingAt = releaseAt.get(appId);
      if (existingAt && Math.abs(existingAt - nextRelease) < 1000) {
        return;
      }
      const existingTimer = timers.get(appId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      const delay = Math.max(nextRelease - Date.now(), 0);
      const timeoutId = window.setTimeout(() => {
        releaseAt.delete(appId);
        timers.delete(appId);
        releaseBundle(appId);
      }, delay);
      timers.set(appId, timeoutId);
      releaseAt.set(appId, nextRelease);
    });
  }, [enabled, getDeliveryPolicy, queued, releaseBundle]);

  useEffect(() => {
    return () => {
      releaseTimers.current.forEach(timer => clearTimeout(timer));
      releaseTimers.current.clear();
      releaseAtRef.current.clear();
    };
  }, []);

  const handleClearSummary = useCallback((bundleId: string) => {
    setBundles(prev => prev.filter(bundle => bundle.id !== bundleId));
  }, []);

  const contextValue = useMemo(
    () => ({ notifications, pushNotification, clearNotifications }),
    [notifications, pushNotification, clearNotifications]
  );

  const hasImmediate = useMemo(() => Object.keys(notifications).length > 0, [notifications]);

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
      <SummaryBundleList bundles={bundles} onClear={handleClearSummary} />
      {hasImmediate && (
        <div className="fixed top-4 right-4 z-30 w-full max-w-sm space-y-2 rounded-md border border-gray-700 bg-black/80 p-3 text-sm text-white shadow-xl backdrop-blur">
          {Object.entries(notifications).map(([appId, list]) => (
            <section key={appId} className="border-b border-gray-700 pb-2 last:border-b-0 last:pb-0">
              <header className="mb-1 text-xs uppercase tracking-wide text-gray-400">{appId}</header>
              <ul className="space-y-1">
                {list.map(n => (
                  <li key={n.id}>{n.message}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
