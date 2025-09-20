import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { ToastCategory, useSoundTheme } from '../../hooks/useSoundTheme';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
  category: ToastCategory;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  pushNotification: (appId: string, message: string, category?: ToastCategory) => void;
  clearNotifications: (appId?: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>({});
  const [visualBursts, setVisualBursts] = useState<{ id: string; category: ToastCategory }[]>([]);
  const burstTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const { soundTheme, soundThemeVolume, audioCues } = useSettings();
  const { playCategoryTone } = useSoundTheme({
    themeId: soundTheme,
    volumeMultiplier: soundThemeVolume,
    enabled: audioCues,
  });

  const pushNotification = useCallback(
    (appId: string, message: string, category: ToastCategory = 'info') => {
      const entry: AppNotification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        date: Date.now(),
        category,
      };
      setNotifications(prev => {
        const list = prev[appId] ?? [];
        const next = {
          ...prev,
          [appId]: [...list, entry],
        };
        return next;
      });
      playCategoryTone(category);
      setVisualBursts(prev => [...prev, { id: entry.id, category }]);
      const timeout = setTimeout(() => {
        setVisualBursts(prev => prev.filter(burst => burst.id !== entry.id));
        burstTimeouts.current = burstTimeouts.current.filter(id => id !== timeout);
      }, 1200);
      burstTimeouts.current.push(timeout);
    },
    [playCategoryTone],
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

  useEffect(() => () => {
    burstTimeouts.current.forEach(id => clearTimeout(id));
    burstTimeouts.current = [];
  }, []);

  useEffect(() => {
    const nav: any = navigator;
    if (nav && nav.setAppBadge) {
      if (totalCount > 0) nav.setAppBadge(totalCount).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }
  }, [totalCount]);

  const categoryLabels: Record<ToastCategory, string> = {
    info: 'Info',
    success: 'Success',
    warning: 'Warning',
    error: 'Alert',
  };

  const pulseColors: Record<ToastCategory, string> = {
    info: 'bg-sky-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-red-500',
  };

  const chipColors: Record<ToastCategory, string> = {
    info: 'text-sky-300',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    error: 'text-red-300',
  };

  return (
    <NotificationsContext.Provider
      value={{ notifications, pushNotification, clearNotifications }}
    >
      {children}
      <div className="notification-center pointer-events-none fixed bottom-4 right-4 z-40 flex w-72 flex-col gap-3 text-xs text-ubt-grey">
        <div className="flex h-6 items-center justify-end gap-1" aria-hidden="true">
          {visualBursts.map(burst => (
            <span key={burst.id} className="relative inline-flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${pulseColors[burst.category]} animate-ping`}></span>
              <span className={`relative inline-flex h-3 w-3 rounded-full ${pulseColors[burst.category]}`}></span>
            </span>
          ))}
        </div>
        {Object.entries(notifications).map(([appId, list]) => (
          <section
            key={appId}
            className="notification-group rounded-lg border border-gray-800 bg-black/70 p-3 shadow-lg shadow-black/40"
          >
            <h3 className="text-sm font-semibold text-ubt-grey">{appId}</h3>
            <ul className="mt-2 space-y-2" aria-live="polite">
              {list.map(n => (
                <li
                  key={n.id}
                  className="rounded-md bg-gray-900/40 px-2 py-1"
                >
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
                    <span className={`font-semibold ${chipColors[n.category]}`}>
                      {categoryLabels[n.category]}
                    </span>
                    <time
                      className="text-[10px] text-ubt-grey/60"
                      dateTime={new Date(n.date).toISOString()}
                    >
                      {new Date(n.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <p className="text-xs text-ubt-grey">{n.message}</p>
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
