import React, {
  createContext,
  useCallback,
  useEffect,
  useState,
} from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export interface AppNotification {
  id: string;
  message: string;
  date: number;
  closing?: boolean;
}

interface LogEntry extends AppNotification {
  appId: string;
}

interface NotificationsContextValue {
  notifications: Record<string, AppNotification[]>;
  log: LogEntry[];
  pushNotification: (appId: string, message: string) => void;
  clearNotifications: (appId?: string) => void;
  clearLog: () => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

type Tab = 'general' | 'applications' | 'log';
type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<
    Record<string, AppNotification[]>
  >({});
  const [log, setLog] = usePersistentState<LogEntry[]>(
    'notification-log',
    [],
  );
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [doNotDisturb, setDoNotDisturb] = usePersistentState<boolean>(
    'notifications-dnd',
    false,
  );
  const [position, setPosition] = useState<Position>('top-right');
  const [appSettings, setAppSettings] = usePersistentState<
    Record<string, { enabled: boolean; urgency: string }>
  >('notification-app-settings', {});
  const [quietStart, setQuietStart] = usePersistentState<string>(
    'notification-quiet-start',
    '22:00',
  );
  const [quietEnd, setQuietEnd] = usePersistentState<string>(
    'notification-quiet-end',
    '07:00',
  );

  const isQuietHours = useCallback(() => {
    if (!quietStart || !quietEnd) return false;
    const now = new Date();
    const [sH, sM] = quietStart.split(':').map(Number);
    const [eH, eM] = quietEnd.split(':').map(Number);
    const start = new Date();
    start.setHours(sH, sM, 0, 0);
    const end = new Date();
    end.setHours(eH, eM, 0, 0);
    if (start <= end) {
      return now >= start && now <= end;
    }
    return now >= start || now <= end;
  }, [quietStart, quietEnd]);

  const pushNotification = useCallback(
    (appId: string, message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      const entry: LogEntry = { id, message, date: Date.now(), appId };
      setLog(prev => [...prev, entry]);
      setAppSettings(prev => {
        if (prev[appId]) return prev;
        return { ...prev, [appId]: { enabled: true, urgency: 'normal' } };
      });
      const settings = appSettings[appId] ?? {
        enabled: true,
        urgency: 'normal',
      };
      if (doNotDisturb || isQuietHours() || !settings.enabled) return;
      setNotifications(prev => {
        const list = prev[appId] ?? [];
        const next = {
          ...prev,
          [appId]: [...list, entry],
        };
        return next;
      });
      // schedule fade-out removal
      setTimeout(() => {
        setNotifications(prev => {
          const list = prev[appId];
          if (!list) return prev;
          const idx = list.findIndex(n => n.id === id);
          if (idx === -1) return prev;
          const updated = [...list];
          updated[idx] = { ...updated[idx], closing: true };
          const next = { ...prev, [appId]: updated };
          setTimeout(() => {
            setNotifications(p2 => {
              const l2 = p2[appId];
              if (!l2) return p2;
              const filtered = l2.filter(n => n.id !== id);
              const final = { ...p2, [appId]: filtered };
              if (filtered.length === 0) delete final[appId];
              return final;
            });
          }, 500);
          return next;
        });
      }, 5000);
    },
    [doNotDisturb, appSettings, isQuietHours, setAppSettings]
  );

  const clearNotifications = useCallback((appId?: string) => {
    setNotifications(prev => {
      if (!appId) return {};
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const clearLog = useCallback(() => {
    setLog([]);
  }, [setLog]);

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

  const renderTab = () => {
    if (activeTab === 'log') {
      return (
        <section className="notification-group">
          <ul>
            {log.map(n => (
              <li key={n.id} className={n.closing ? 'fade' : ''}>
                [{n.appId}] {n.message}
              </li>
            ))}
          </ul>
        </section>
      );
    }

    if (activeTab === 'applications') {
      return (
        <>
          {Object.entries(appSettings).map(([appId, settings]) => (
            <section key={appId} className="notification-group">
              <h3>{appId}</h3>
              <label>
                <input
                  type="checkbox"
                  aria-label="Enable"
                  checked={settings.enabled}
                  onChange={e =>
                    setAppSettings(prev => ({
                      ...prev,
                      [appId]: { ...settings, enabled: e.target.checked },
                    }))
                  }
                />
                Enabled
              </label>
              <label>
                Urgency
                <select
                  value={settings.urgency}
                  onChange={e =>
                    setAppSettings(prev => ({
                      ...prev,
                      [appId]: { ...settings, urgency: e.target.value },
                    }))
                  }
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </section>
          ))}
        </>
      );
    }

    const list = notifications['general'] ?? [];
    return (
      <section className="notification-group">
        <ul>
          {list.map(n => (
            <li key={n.id} className={n.closing ? 'fade' : ''}>
              {n.message}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <NotificationsContext.Provider
      value={{ notifications, log, pushNotification, clearNotifications, clearLog }}
    >
      {children}
      <div className={`notification-center ${position}`}>
        <div className="notification-controls">
          <div className="notification-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={activeTab === 'general' ? 'active' : ''}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('applications')}
              className={activeTab === 'applications' ? 'active' : ''}
            >
              Applications
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('log')}
              className={activeTab === 'log' ? 'active' : ''}
            >
              Log
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDoNotDisturb(v => !v)}
            aria-label="Toggle Do Not Disturb"
            className="notification-bell"
          >
            {doNotDisturb ? '🔕' : '🔔'}
          </button>
          <div className="quiet-hours">
            <span>Quiet Hours</span>
            <input
              type="time"
              aria-label="Quiet hours start"
              value={quietStart}
              onChange={e => setQuietStart(e.target.value)}
            />
            <input
              type="time"
              aria-label="Quiet hours end"
              value={quietEnd}
              onChange={e => setQuietEnd(e.target.value)}
            />
          </div>
          <select
            value={position}
            onChange={e => setPosition(e.target.value as Position)}
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </div>
        {renderTab()}
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
