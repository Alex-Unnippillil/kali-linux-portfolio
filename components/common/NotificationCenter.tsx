import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useSettings, isWithinQuietHours, DndOverrides } from '../../hooks/useSettings';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
  urgency: 'normal' | 'urgent';
  overrideReason?: string;
  source?: string;
  scheduleId?: string;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (appId: string, payload: NotificationPayload) => void;
  clearNotifications: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export interface NotificationOptions {
  message: string;
  urgency?: 'normal' | 'urgent';
  source?: string;
  timestamp?: number;
}

export type NotificationPayload = string | NotificationOptions;

const formatScheduleDescriptor = (scheduleLabel?: string, start?: string, end?: string) => {
  if (scheduleLabel) return scheduleLabel;
  if (start && end) return `${start}–${end}`;
  return undefined;
};

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const { dndEnabled, dndSchedules, dndOverrides, urgentAllowList } = useSettings();

  const pushNotification = useCallback(
    (appId: string, payload: NotificationPayload) => {
      const normalized: NotificationOptions =
        typeof payload === 'string' ? { message: payload } : payload;
      const { message, urgency = 'normal', source, timestamp } = normalized;
      const createdAt = timestamp ?? Date.now();

      const evaluation = isWithinQuietHours(dndSchedules, new Date(createdAt));
      const schedule = evaluation.schedule;
      const scheduleDescriptor = formatScheduleDescriptor(
        schedule?.label,
        schedule?.start,
        schedule?.end
      );
      const overrideMode: DndOverrides[string] | undefined = dndOverrides[appId];

      let shouldBlock = false;
      let overrideReason: string | undefined;

      if (overrideMode === 'block') {
        shouldBlock = true;
      } else if (dndEnabled && evaluation.active) {
        if (overrideMode === 'allow') {
          overrideReason = scheduleDescriptor
            ? `Bypassed quiet hours via app override (${scheduleDescriptor})`
            : 'Bypassed quiet hours via app override';
        } else if (urgency === 'urgent') {
          const allowedBySource =
            (source && urgentAllowList.includes(source)) || urgentAllowList.includes(appId);
          if (allowedBySource) {
            const base = source
              ? `Urgent alert allowed for ${source}`
              : 'Urgent alert allowed';
            overrideReason = scheduleDescriptor ? `${base} (${scheduleDescriptor})` : base;
          } else {
            shouldBlock = true;
          }
        } else {
          shouldBlock = true;
        }
      }

      if (shouldBlock) {
        setNotifications(prev => {
          if (!prev[appId]) return prev;
          const next = { ...prev };
          delete next[appId];
          return next;
        });
        return;
      }

      setNotifications(prev => {
        const list = prev[appId] ?? [];
        const nextEntry: AppNotification = {
          id: `${createdAt}-${Math.random()}`,
          message,
          date: createdAt,
          urgency,
          overrideReason,
          source,
          scheduleId: schedule?.id,
        };
        return {
          ...prev,
          [appId]: [...list, nextEntry],
        };
      });
    },
    [dndEnabled, dndSchedules, dndOverrides, urgentAllowList]
  );

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications(prev => {
      if (!appId) return {};
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const totalCount = Object.values(notifications).reduce(
    (sum, list) => sum + list.length,
    0
  );

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
      <div className="notification-center">
        {Object.entries(notifications).map(([appId, list]) => (
          <section key={appId} className="notification-group">
            <h3>{appId}</h3>
            <ul>
              {list.map(n => (
                <li key={n.id} className={n.urgency === 'urgent' ? 'urgent-notification' : ''}>
                  <div>{n.message}</div>
                  {n.overrideReason && (
                    <p className="text-xs text-ubt-grey italic">{n.overrideReason}</p>
                  )}
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
