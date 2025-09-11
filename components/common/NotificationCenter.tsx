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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

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
      if (doNotDisturb || !settings.enabled) return;
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
    [doNotDisturb, appSettings, setAppSettings]
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

  const renderWithTimestamps = (list: AppNotification[]) => {
    const sorted = [...list].sort((a, b) => a.date - b.date);
    const items: React.ReactNode[] = [];
    let lastLabel = '';
    sorted.forEach(n => {
      const label = new Date(n.date).toLocaleString();
      if (label !== lastLabel) {
        items.push(
          <li key={`${n.id}-ts`} className="timestamp-separator">
            {label}
          </li>,
        );
        lastLabel = label;
      }
      items.push(
        <li key={n.id} className={n.closing ? 'fade' : ''}>
          {n.message}
        </li>,
      );
    });
    return items;
  };

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

    const systemList =
      notifications['system'] ?? notifications['general'] ?? [];
    const appEntries = Object.entries(notifications).filter(
      ([appId]) => appId !== 'system' && appId !== 'general',
    );

    const renderGroup = (
      title: string,
      id: string,
      list: AppNotification[],
    ) => (
      <section key={id} className="notification-group">
        <header>
          <h3>{title}</h3>
          <div className="notification-actions">
            <button
              type="button"
              onClick={() => toggleCollapse(id)}
              aria-expanded={!collapsed[id]}
              aria-controls={`group-${id}`}
            >
              {collapsed[id] ? 'Expand' : 'Collapse'}
            </button>
            <button type="button" onClick={() => clearNotifications(id)}>
              Clear
            </button>
          </div>
        </header>
        {!collapsed[id] && <ul id={`group-${id}`}>{renderWithTimestamps(list)}</ul>}
      </section>
    );

    return (
      <>
        {systemList.length > 0 && renderGroup('System', 'system', systemList)}
        {appEntries.length > 0 && (
          <section className="notification-category">
            <h2>Apps</h2>
            {appEntries.map(([appId, list]) =>
              renderGroup(appId, appId, list),
            )}
          </section>
        )}
      </>
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
