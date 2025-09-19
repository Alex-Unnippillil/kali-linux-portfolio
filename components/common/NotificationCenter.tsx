import React, { createContext, useCallback, useEffect, useState } from 'react';
import type { DndSchedule } from '../../hooks/useSettings';
import { useSettings } from '../../hooks/useSettings';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (appId: string, message: string) => void;
  clearNotifications: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatDays = (days: number[]) => {
  if (!days || days.length === 0) return 'Every day';
  const normalized = Array.from(new Set(days)).map((day) => ((day % 7) + 7) % 7).sort((a, b) => a - b);
  if (normalized.length === 7) return 'Every day';
  if (normalized.length === 5 && normalized.every((day, index) => day === index + 1)) return 'Weekdays';
  if (normalized.length === 2 && normalized[0] === 0 && normalized[1] === 6) return 'Weekends';
  return normalized.map((day) => DAY_NAMES[day]).join(', ');
};

const isValidTimeValue = (value: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const {
    dndActive,
    dndOverride,
    dndScheduleActive,
    dndSchedules,
    toggleDnd,
    clearDndOverride,
    updateDndSchedule,
  } = useSettings();

  const pushNotification = useCallback((appId: string, message: string) => {
    setNotifications(prev => {
      const list = prev[appId] ?? [];
      const next = {
        ...prev,
        [appId]: [
          ...list,
          {
            id: `${Date.now()}-${Math.random()}`,
            message,
            date: Date.now(),
          },
        ],
      };
      return next;
    });
  }, []);

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

  const handleScheduleToggle = useCallback(
    (id: string, enabled: boolean) => {
      updateDndSchedule(id, { enabled });
    },
    [updateDndSchedule]
  );

  const handleTimeChange = (
    id: string,
    field: 'start' | 'end'
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!isValidTimeValue(value)) return;
    updateDndSchedule(id, { [field]: value } as Partial<Omit<DndSchedule, 'id'>>);
  };

  const dndStatusLabel = (() => {
    if (dndOverride === 'on') return 'Active (manual)';
    if (dndOverride === 'off') return 'Off (manual override)';
    if (dndScheduleActive) return 'Active (scheduled)';
    return 'Off';
  })();

  const toggleLabel = dndActive ? 'Turn off now' : 'Turn on now';
  const showScheduleResume = dndOverride !== null;

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
        <section className="notification-group rounded-md border border-white/10 bg-black/60 p-4 text-sm text-white space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Do Not Disturb</h3>
              <p className="text-xs text-white/70">{dndStatusLabel}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleDnd}
                className="rounded border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                {toggleLabel}
              </button>
              {showScheduleResume && (
                <button
                  type="button"
                  onClick={clearDndOverride}
                  className="rounded border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  Use schedules
                </button>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {dndSchedules.map((schedule) => {
              const toggleId = `${schedule.id}-toggle`;
              const toggleLabelId = `${toggleId}-label`;
              const startId = `${schedule.id}-start`;
              const endId = `${schedule.id}-end`;
              const startLabelId = `${startId}-label`;
              const endLabelId = `${endId}-label`;
              return (
                <div
                  key={schedule.id}
                  className="rounded border border-white/10 bg-black/40 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{schedule.label}</p>
                      {schedule.description && (
                        <p className="text-xs text-white/60">{schedule.description}</p>
                      )}
                      <p className="mt-1 text-xs text-white/60">{formatDays(schedule.days)}</p>
                    </div>
                    <label htmlFor={toggleId} className="flex items-center gap-2 text-sm">
                      <span id={toggleLabelId} className="sr-only">
                        {`Enable ${schedule.label}`}
                      </span>
                      <span aria-hidden>{schedule.enabled ? 'On' : 'Off'}</span>
                      <input
                        id={toggleId}
                        type="checkbox"
                        aria-labelledby={toggleLabelId}
                        checked={schedule.enabled}
                        onChange={(event) =>
                          handleScheduleToggle(schedule.id, event.target.checked)
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <label className="flex flex-col gap-1" htmlFor={startId}>
                      <span
                        id={startLabelId}
                        className="text-xs text-white/60 uppercase tracking-wide"
                      >
                        Start
                      </span>
                      <input
                        id={startId}
                        type="time"
                        aria-labelledby={startLabelId}
                        value={schedule.start}
                        onChange={handleTimeChange(schedule.id, 'start')}
                        className="rounded border border-white/20 bg-black/60 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                        step="60"
                      />
                    </label>
                    <label className="flex flex-col gap-1" htmlFor={endId}>
                      <span
                        id={endLabelId}
                        className="text-xs text-white/60 uppercase tracking-wide"
                      >
                        End
                      </span>
                      <input
                        id={endId}
                        type="time"
                        aria-labelledby={endLabelId}
                        value={schedule.end}
                        onChange={handleTimeChange(schedule.id, 'end')}
                        className="rounded border border-white/20 bg-black/60 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                        step="60"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        {Object.entries(notifications).length === 0 ? (
          <p className="text-sm text-white/60">No notifications yet.</p>
        ) : (
          Object.entries(notifications).map(([appId, list]) => (
            <section key={appId} className="notification-group">
              <h3>{appId}</h3>
              <ul>
                {list.map((n) => (
                  <li key={n.id}>{n.message}</li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
