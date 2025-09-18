import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import SummaryBundleList from '../apps/notifications/SummaryBundleList';
import {
  NotificationAction,
  NotificationBundle,
  NotificationMessage,
} from '../apps/notifications/types';
import { useSettings } from '../../hooks/useSettings';
import { computeNextSummary } from '../../utils/focusSchedule';
import { logEvent } from '../../utils/analytics';

export interface NotificationOptions {
  critical?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationsContextValue {
  notifications: Record<string, NotificationMessage[]>;
  bundles: NotificationBundle[];
  pushNotification: (
    appId: string,
    message: string,
    options?: NotificationOptions,
  ) => void;
  clearNotifications: (appId?: string) => void;
  clearBundle: (bundleId: string) => void;
}

export const NotificationsContext =
  createContext<NotificationsContextValue | null>(null);

const buildMessage = (
  message: string,
  options?: NotificationOptions,
): NotificationMessage => ({
  id: `${Date.now()}-${Math.random()}`,
  message,
  date: Date.now(),
  critical: options?.critical ?? false,
  actions: options?.actions ?? [],
});

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { focusMode } = useSettings();
  const [notifications, setNotifications] = useState<
    Record<string, NotificationMessage[]>
  >({});
  const [bundles, setBundles] = useState<NotificationBundle[]>([]);
  const [queued, setQueued] = useState<Record<string, NotificationMessage[]>>({});
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastDeliveredRef = useRef<Record<string, number>>({});
  const queuedRef = useRef<Record<string, NotificationMessage[]>>({});

  const updateQueued = useCallback(
    (
      updater:
        | Record<string, NotificationMessage[]>
        | ((prev: Record<string, NotificationMessage[]>) => Record<string, NotificationMessage[]>)
    ) => {
      setQueued(prev => {
        const next =
          typeof updater === 'function'
            ? (updater as (
                prev: Record<string, NotificationMessage[]>,
              ) => Record<string, NotificationMessage[]>)(prev)
            : updater;
        queuedRef.current = next;
        return next;
      });
    },
    [],
  );

  const releaseBundle = useCallback(
    (appId: string) => {
      let delivered: NotificationMessage[] = [];
      updateQueued(prev => {
        const list = prev[appId] ?? [];
        if (!list.length) return prev;
        delivered = list;
        const next = { ...prev };
        delete next[appId];
        return next;
      });

      if (!delivered.length) {
        if (timersRef.current[appId]) {
          clearTimeout(timersRef.current[appId]);
          delete timersRef.current[appId];
        }
        return;
      }

      const bundle: NotificationBundle = {
        id: `${appId}-${Date.now()}`,
        appId,
        notifications: delivered,
        deliveredAt: Date.now(),
      };

      setBundles(prev => [...prev, bundle]);
      lastDeliveredRef.current[appId] = bundle.deliveredAt;
      logEvent({
        category: 'focus-mode',
        action: 'summary-delivered',
        label: appId,
        value: delivered.length,
      });

      if (timersRef.current[appId]) {
        clearTimeout(timersRef.current[appId]);
        delete timersRef.current[appId];
      }
    },
    [updateQueued],
  );

  const scheduleDelivery = useCallback(
    (appId: string) => {
      if (!focusMode.enabled) return;
      const override = focusMode.overrides[appId];
      if (override?.deliverImmediately) return;

      const queue = queuedRef.current[appId] ?? [];
      if (!queue.length) return;

      const now = new Date();
      const target = computeNextSummary(
        focusMode,
        appId,
        lastDeliveredRef.current[appId],
        now,
      );
      const delay = Math.max(target.getTime() - now.getTime(), 0);

      if (timersRef.current[appId]) {
        clearTimeout(timersRef.current[appId]);
      }

      timersRef.current[appId] = setTimeout(() => {
        releaseBundle(appId);
      }, delay);
    },
    [focusMode, releaseBundle],
  );

  const pushNotification = useCallback<
    NotificationsContextValue['pushNotification']
  >(
    (appId, message, options) => {
      const entry = buildMessage(message, options);

      const shouldQueue =
        focusMode.enabled &&
        focusMode.queueNonCritical &&
        !entry.critical &&
        !focusMode.overrides[appId]?.deliverImmediately;

      if (!shouldQueue) {
        setNotifications(prev => {
          const list = prev[appId] ?? [];
          return {
            ...prev,
            [appId]: [...list, entry],
          };
        });
        return;
      }

      updateQueued(prev => {
        const list = prev[appId] ?? [];
        const next = {
          ...prev,
          [appId]: [...list, entry],
        };
        return next;
      });
      logEvent({
        category: 'focus-mode',
        action: 'notification-queued',
        label: appId,
      });
      scheduleDelivery(appId);
    },
    [focusMode, scheduleDelivery, updateQueued],
  );

  const clearNotifications = useCallback<
    NotificationsContextValue['clearNotifications']
  >(
    appId => {
      if (!appId) {
        setNotifications({});
        updateQueued({});
        setBundles([]);
        Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
        timersRef.current = {};
        lastDeliveredRef.current = {};
        return;
      }

      setNotifications(prev => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      updateQueued(prev => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      setBundles(prev => prev.filter(bundle => bundle.appId !== appId));
      if (timersRef.current[appId]) {
        clearTimeout(timersRef.current[appId]);
        delete timersRef.current[appId];
      }
      delete lastDeliveredRef.current[appId];
    },
    [updateQueued],
  );

  const clearBundle = useCallback<NotificationsContextValue['clearBundle']>(
    bundleId => {
      setBundles(prev => prev.filter(bundle => bundle.id !== bundleId));
      if (expandedBundle === bundleId) setExpandedBundle(null);
      logEvent({
        category: 'focus-mode',
        action: 'summary-dismissed',
        label: bundleId,
      });
    },
    [expandedBundle],
  );

  useEffect(() => {
    if (!focusMode.enabled) {
      Object.keys(queuedRef.current).forEach(releaseBundle);
      return;
    }
    Object.keys(queuedRef.current).forEach(appId => scheduleDelivery(appId));
  }, [focusMode.enabled, releaseBundle, scheduleDelivery]);

  useEffect(() => {
    if (!focusMode.enabled) return;
    Object.keys(queuedRef.current).forEach(appId => scheduleDelivery(appId));
  }, [
    focusMode.defaultCadenceMinutes,
    focusMode.summaryTimes,
    focusMode.overrides,
    focusMode.enabled,
    scheduleDelivery,
  ]);

  useEffect(() => {
    if (!focusMode.queueNonCritical) {
      Object.keys(queuedRef.current).forEach(releaseBundle);
    }
  }, [focusMode.queueNonCritical, releaseBundle]);

  const totalCount = useMemo(() => {
    const direct = Object.values(notifications).reduce(
      (sum, list) => sum + list.length,
      0,
    );
    const queuedCount = Object.values(queued).reduce(
      (sum, list) => sum + list.length,
      0,
    );
    return direct + queuedCount;
  }, [notifications, queued]);

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        bundles,
        pushNotification,
        clearNotifications,
        clearBundle,
      }}
    >
      {children}
      {(bundles.length > 0 || Object.keys(notifications).length > 0) && (
        <div className="notification-center space-y-4">
          {bundles.length > 0 && (
            <section className="notification-group">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Focus summaries
              </h2>
              <SummaryBundleList
                bundles={bundles}
                expandedId={expandedBundle}
                onToggle={setExpandedBundle}
                onDismiss={clearBundle}
              />
            </section>
          )}

          {Object.entries(notifications).map(([appId, list]) => (
            <section key={appId} className="notification-group">
              <h3 className="text-sm font-semibold text-gray-200">{appId}</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-100">
                {list.map(entry => (
                  <li
                    key={entry.id}
                    className="bg-black bg-opacity-40 rounded px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span>{entry.message}</span>
                      <time className="text-xs text-gray-400">
                        {new Date(entry.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    {entry.actions && entry.actions.length > 0 && (
                      <div className="mt-2 flex space-x-2">
                        {entry.actions.map(action => (
                          <button
                            key={action.label}
                            className="text-xs underline"
                            type="button"
                            onClick={action.onClick}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
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
