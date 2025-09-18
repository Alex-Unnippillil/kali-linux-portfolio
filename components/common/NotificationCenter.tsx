import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import apps from '../../apps.config';
import {
  SummaryBundle,
  NotificationAction,
} from '../apps/notifications/types';
import SummaryBundleList from '../apps/notifications/SummaryBundleList';
import {
  FocusModeContext,
  SummaryDeliveryReason,
} from '../../hooks/useFocusMode';

export interface AppNotification {
  id: string;
  appId: string;
  message: string;
  date: number;
  critical?: boolean;
  actions?: NotificationAction[];
}

export interface PushNotificationOptions {
  critical?: boolean;
  actions?: NotificationAction[];
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (
    appId: string,
    message: string,
    options?: PushNotificationOptions
  ) => void;
  clearNotifications: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const appTitleMap = new Map<string, string>();
apps.forEach((item) => {
  if (!appTitleMap.has(item.id)) {
    appTitleMap.set(item.id, item.title);
  }
});

const randomId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const mergeActions = (items: AppNotification[]): NotificationAction[] => {
  const seen = new Set<string>();
  const actions: NotificationAction[] = [];
  items.forEach((notification) => {
    notification.actions?.forEach((action, index) => {
      const id = action.id ?? `${notification.id}-action-${index}`;
      if (seen.has(id)) return;
      seen.add(id);
      actions.push({ id, label: action.label, onSelect: action.onSelect });
    });
  });
  return actions;
};

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const focusMode = React.useContext(FocusModeContext);
  const [notifications, setNotifications] = useState<
    Record<string, AppNotification[]>
  >({});
  const [queued, setQueued] = useState<Record<string, AppNotification[]>>({});
  const [summaries, setSummaries] = useState<SummaryBundle[]>([]);
  const queuedRef = useRef<Record<string, AppNotification[]>>(queued);

  useEffect(() => {
    queuedRef.current = queued;
  }, [queued]);

  const deliverImmediate = useCallback((notification: AppNotification) => {
    setNotifications((prev) => {
      const list = prev[notification.appId] ?? [];
      return {
        ...prev,
        [notification.appId]: [...list, notification],
      };
    });
  }, []);

  const pushNotification = useCallback(
    (appId: string, message: string, options: PushNotificationOptions = {}) => {
      const notification: AppNotification = {
        id: randomId(),
        appId,
        message,
        date: Date.now(),
        critical: options.critical,
        actions: options.actions,
      };
      if (focusMode?.shouldDeferNotification(appId, Boolean(options.critical))) {
        setQueued((prev) => {
          const existing = prev[appId] ?? [];
          return {
            ...prev,
            [appId]: [...existing, notification],
          };
        });
        return;
      }
      deliverImmediate(notification);
    },
    [deliverImmediate, focusMode]
  );

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications((prev) => {
      if (!appId) return {};
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    if (!appId) {
      setSummaries([]);
    }
  }, []);

  const queueLength = useMemo(
    () =>
      Object.values(queued).reduce((sum, list) => {
        return sum + list.length;
      }, 0),
    [queued]
  );

  useEffect(() => {
    focusMode?.updateQueueLength(queueLength);
  }, [focusMode, queueLength]);

  const flushQueued = useCallback(
    (reason: SummaryDeliveryReason) => {
      const current = queuedRef.current;
      const entries = Object.entries(current);
      if (!entries.length) return 0;
      const deliveredAt = Date.now();
      const bundles: SummaryBundle[] = entries.map(([appId, list]) => ({
        id: `bundle-${appId}-${deliveredAt}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        appId,
        appTitle: appTitleMap.get(appId) ?? appId,
        count: list.length,
        deliveredAt,
        latestMessage: list[list.length - 1]?.message ?? '',
        actions: mergeActions(list),
      }));
      setSummaries((prev) => [...bundles, ...prev]);
      setQueued({});
      return entries.reduce((sum, [, list]) => sum + list.length, 0);
    },
    []
  );

  useEffect(() => {
    if (!focusMode) return;
    return focusMode.registerSummaryListener((reason) => flushQueued(reason));
  }, [flushQueued, focusMode]);

  const dismissSummary = useCallback((id: string) => {
    setSummaries((prev) => prev.filter((bundle) => bundle.id !== id));
  }, []);

  const totalCount = useMemo(() => {
    const immediate = Object.values(notifications).reduce(
      (sum, list) => sum + list.length,
      0
    );
    return immediate + queueLength;
  }, [notifications, queueLength]);

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, pushNotification, clearNotifications }}
    >
      {children}
      <div className="notification-center space-y-4">
        {summaries.length > 0 && (
          <section className="notification-group focus-summary space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
              Focus summaries
            </h2>
            <SummaryBundleList bundles={summaries} onDismiss={dismissSummary} />
          </section>
        )}
        {Object.entries(notifications).map(([appId, list]) => (
          <section key={appId} className="notification-group">
            <h3 className="text-sm font-semibold text-white">
              {appTitleMap.get(appId) ?? appId}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-ubt-grey">
              {list.map((n) => (
                <li key={n.id} className="rounded bg-black bg-opacity-40 px-3 py-2">
                  {n.message}
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
