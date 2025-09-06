import React, {
  createContext,
  useCallback,
  useEffect,
  useState,
} from 'react';

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
  pushNotification: (appId: string, message: string) => void;
  clearNotifications: (appId?: string) => void;
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
  const [log, setLog] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [position, setPosition] = useState<Position>('top-right');

  const pushNotification = useCallback(
    (appId: string, message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      const entry: LogEntry = { id, message, date: Date.now(), appId };
      setLog(prev => [...prev, entry]);
      if (doNotDisturb) return;
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
    [doNotDisturb]
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
          {Object.entries(notifications)
            .filter(([id]) => id !== 'general')
            .map(([appId, list]) => (
              <section key={appId} className="notification-group">
                <h3>{appId}</h3>
                <ul>
                  {list.map(n => (
                    <li key={n.id} className={n.closing ? 'fade' : ''}>
                      {n.message}
                    </li>
                  ))}
                </ul>
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
      value={{ notifications, pushNotification, clearNotifications }}
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
          <label>
            <input
              type="checkbox"
              checked={doNotDisturb}
              onChange={e => setDoNotDisturb(e.target.checked)}
            />
            Do Not Disturb
          </label>
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
