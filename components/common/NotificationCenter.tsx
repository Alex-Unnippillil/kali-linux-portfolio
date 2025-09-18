import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  NotificationsContext,
  type NotificationsContextValue,
} from '../../hooks/notificationsContext';
import type {
  AppNotification,
  NotificationInput,
  NotificationSummarySnapshot,
} from '../../types/notifications';
import {
  DEFAULT_SUMMARY_INTERVAL_MS,
  getDoNotDisturbPreference,
  getSummaryIntervalPreference,
  setDoNotDisturbPreference,
  setSummaryIntervalPreference,
} from '../../utils/settings/notificationPreferences';
import { logEvent } from '../../utils/analytics';
import {
  buildNotificationGroups,
  computeSummaryStats,
} from '../../hooks/useNotifications';

const createNotification = (input: NotificationInput): AppNotification => {
  const timestamp = input.date ?? Date.now();
  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 10)}`,
    appId: input.appId,
    subject: input.subject,
    body: input.body,
    date: timestamp,
    isCritical: Boolean(input.isCritical),
  };
};

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<
    NotificationsContextValue['notifications']
  >({});
  const notificationsRef = useRef(notifications);
  const [doNotDisturb, setDoNotDisturbState] = useState(false);
  const [summaryInterval, setSummaryIntervalState] = useState(
    DEFAULT_SUMMARY_INTERVAL_MS,
  );
  const [summaryWindowStart, setSummaryWindowStart] = useState(() => Date.now());
  const summaryWindowStartRef = useRef(summaryWindowStart);
  const [lastSummarySnapshot, setLastSummarySnapshot] =
    useState<NotificationSummarySnapshot | null>(null);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    summaryWindowStartRef.current = summaryWindowStart;
  }, [summaryWindowStart]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedDnd, storedInterval] = await Promise.all([
        getDoNotDisturbPreference(),
        getSummaryIntervalPreference(),
      ]);
      if (!mounted) return;
      setDoNotDisturbState(storedDnd);
      setSummaryIntervalState(storedInterval);
      const now = Date.now();
      summaryWindowStartRef.current = now;
      setSummaryWindowStart(now);
    })().catch(() => {
      // ignore preference load errors
    });
    return () => {
      mounted = false;
    };
  }, []);

  const pushNotification = useCallback((input: NotificationInput) => {
    setNotifications(prev => {
      const list = prev[input.appId] ?? [];
      const nextList = [...list, createNotification(input)];
      return {
        ...prev,
        [input.appId]: nextList,
      };
    });
  }, []);

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications(prev => {
      if (!appId) return {};
      if (!(appId in prev)) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const updateDoNotDisturb = useCallback((value: boolean) => {
    setDoNotDisturbState(value);
    setDoNotDisturbPreference(value).catch(() => {
      // ignore persistence errors
    });
  }, []);

  const updateSummaryInterval = useCallback((value: number) => {
    setSummaryIntervalState(value);
    const now = Date.now();
    summaryWindowStartRef.current = now;
    setSummaryWindowStart(now);
    setSummaryIntervalPreference(value).catch(() => {
      // ignore persistence errors
    });
  }, []);

  const runSummary = useCallback(() => {
    const windowEnd = Date.now();
    const windowStart = summaryWindowStartRef.current;
    const groups = buildNotificationGroups(notificationsRef.current, {
      windowStart,
      windowEnd,
    });
    const stats = computeSummaryStats(groups);
    const snapshot: NotificationSummarySnapshot = {
      windowStart,
      windowEnd,
      stats,
    };
    setLastSummarySnapshot(snapshot);
    if (stats.rawCount > 0) {
      logEvent({
        category: 'notification-center',
        action: 'summary-run',
        label: `interval:${summaryInterval}|raw:${stats.rawCount}|cards:${stats.cardCount}`,
        value: Math.max(0, stats.rawCount - stats.cardCount),
      });
    }
    summaryWindowStartRef.current = windowEnd;
    setSummaryWindowStart(windowEnd);
  }, [summaryInterval]);

  const triggerSummary = useCallback(() => {
    runSummary();
  }, [runSummary]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!summaryInterval || summaryInterval <= 0) return undefined;
    const id = window.setInterval(() => {
      runSummary();
    }, summaryInterval);
    return () => {
      window.clearInterval(id);
    };
  }, [runSummary, summaryInterval]);

  const totalCount = useMemo(
    () =>
      Object.values(notifications).reduce(
        (sum, list) => sum + list.length,
        0,
      ),
    [notifications],
  );

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  const contextValue = useMemo<NotificationsContextValue>(() => ({
    notifications,
    pushNotification,
    clearNotifications,
    doNotDisturb,
    setDoNotDisturb: updateDoNotDisturb,
    summaryInterval,
    setSummaryInterval: updateSummaryInterval,
    summaryWindowStart,
    triggerSummary,
    lastSummarySnapshot,
  }), [
    notifications,
    pushNotification,
    clearNotifications,
    doNotDisturb,
    updateDoNotDisturb,
    summaryInterval,
    updateSummaryInterval,
    summaryWindowStart,
    triggerSummary,
    lastSummarySnapshot,
  ]);

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
export type { NotificationInput } from '../../types/notifications';
