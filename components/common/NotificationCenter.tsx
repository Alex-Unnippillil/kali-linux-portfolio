import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useOptionalFocusMode } from '../../hooks/useFocusMode';
import SummaryBundle from '../apps/notifications/SummaryBundle';
import { logEvent } from '../../utils/analytics';

export interface AppNotification {
  id: string;
  appId: string;
  message: string;
  date: number;
}

export interface NotificationPushOptions {
  critical?: boolean;
}

interface NotificationBundle {
  id: string;
  appId: string;
  notifications: AppNotification[];
  createdAt: number;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (appId: string, message: string, options?: NotificationPushOptions) => void;
  clearNotifications: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const createNotification = (appId: string, message: string): AppNotification => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  appId,
  message,
  date: Date.now(),
});

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const focus = useOptionalFocusMode();
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const [queued, setQueued] = useState<Record<string, AppNotification[]>>({});
  const [bundles, setBundles] = useState<NotificationBundle[]>([]);
  const prevFocusActive = useRef<boolean>(focus?.isFocusActive ?? false);

  const pushNotification = useCallback<NotificationsContextValue['pushNotification']>(
    (appId, message, options) => {
      const notification = createNotification(appId, message);
      const isCritical = options?.critical ?? false;
      const focusActive = focus?.isFocusActive ?? false;
      const deliveryMode = focus?.getAppDeliveryMode(appId) ?? 'bundle';

      if (focusActive && !isCritical) {
        if (deliveryMode === 'mute') {
          logEvent({ category: 'focus-mode', action: 'muted', label: appId });
          return;
        }
        if (deliveryMode === 'bundle') {
          setQueued((prev) => {
            const list = prev[appId] ?? [];
            return { ...prev, [appId]: [...list, notification] };
          });
          logEvent({ category: 'focus-mode', action: 'queued', label: appId });
          return;
        }
      }

      setNotifications((prev) => {
        const list = prev[appId] ?? [];
        return { ...prev, [appId]: [...list, notification] };
      });
    },
    [focus],
  );

  const clearNotifications = useCallback<NotificationsContextValue['clearNotifications']>((appId) => {
    if (!appId) {
      setNotifications({});
      setBundles([]);
      setQueued({});
      return;
    }
    setNotifications((prev) => {
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    setBundles((prev) => prev.filter((bundle) => bundle.appId !== appId));
    setQueued((prev) => {
      if (!(appId in prev)) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const flushQueued = useCallback(
    (reason: 'scheduled' | 'session-end' | 'manual' = 'scheduled') => {
      setQueued((prev) => {
        const entries = Object.entries(prev);
        if (entries.length === 0) return prev;
        const createdAt = Date.now();
        const newBundles = entries.map(([appId, list]) => ({
          id: `summary-${createdAt}-${appId}-${Math.random().toString(36).slice(2, 8)}`,
          appId,
          notifications: list,
          createdAt,
        }));
        const total = entries.reduce((sum, [, list]) => sum + list.length, 0);
        setBundles((existing) => [...newBundles, ...existing]);
        logEvent({
          category: 'focus-mode',
          action: 'summary-delivered',
          label: reason,
          value: total,
        });
        return {};
      });
    },
    [],
  );

  useEffect(() => {
    if (!focus) return;
    if (!focus.isFocusActive) return;
    flushQueued('scheduled');
  }, [focus?.summarySignal, focus?.isFocusActive, flushQueued]);

  useEffect(() => {
    if (!focus) return;
    if (prevFocusActive.current && !focus.isFocusActive) {
      flushQueued('session-end');
    }
    prevFocusActive.current = focus.isFocusActive;
  }, [focus?.isFocusActive, flushQueued]);

  const handleOpenBundle = useCallback((bundle: NotificationBundle) => {
    setBundles((prev) => prev.filter((item) => item.id !== bundle.id));
    setNotifications((prev) => {
      const list = prev[bundle.appId] ?? [];
      return { ...prev, [bundle.appId]: [...list, ...bundle.notifications] };
    });
    logEvent({
      category: 'focus-mode',
      action: 'summary-open',
      label: bundle.appId,
      value: bundle.notifications.length,
    });
  }, []);

  const handleDismissBundle = useCallback((bundle: NotificationBundle) => {
    setBundles((prev) => prev.filter((item) => item.id !== bundle.id));
    logEvent({ category: 'focus-mode', action: 'summary-dismiss', label: bundle.appId });
  }, []);

  const totalCount = useMemo(() => {
    const direct = Object.values(notifications).reduce((sum, list) => sum + list.length, 0);
    const pending = Object.values(queued).reduce((sum, list) => sum + list.length, 0);
    const bundled = bundles.reduce((sum, bundle) => sum + bundle.notifications.length, 0);
    return direct + pending + bundled;
  }, [bundles, notifications, queued]);

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  return (
    <NotificationsContext.Provider value={{ notifications, pushNotification, clearNotifications }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex max-h-[70vh] w-80 flex-col gap-3 overflow-y-auto pr-2">
        {bundles.map((bundle) => (
          <SummaryBundle
            key={bundle.id}
            appId={bundle.appId}
            notifications={bundle.notifications}
            createdAt={bundle.createdAt}
            onView={() => handleOpenBundle(bundle)}
            onDismiss={() => handleDismissBundle(bundle)}
          />
        ))}
        {Object.entries(notifications).map(([appId, list]) => (
          <section
            key={appId}
            className="pointer-events-auto rounded-lg border border-gray-700 bg-gray-900/95 p-3 text-sm text-white shadow-lg"
          >
            <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-gray-300">
              <span>{appId}</span>
              <span>{list.length}</span>
            </header>
            <ul className="space-y-1">
              {list.map((n) => (
                <li key={n.id} className="flex flex-col">
                  <span className="text-xs text-gray-400">
                    {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>{n.message}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
