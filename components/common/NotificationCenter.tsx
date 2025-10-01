import React, {
  createContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { safeLocalStorage } from '../../utils/safeStorage';

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

const STORAGE_KEY = 'notification-center::history';
const FILTER_ALL_KEY = 'all';
const RETENTION_DAYS = 7;
const RETENTION_WINDOW = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const MAX_PER_APP = 50;

const pruneNotifications = (
  data: Record<string, AppNotification[]>,
): Record<string, AppNotification[]> => {
  const cutoff = Date.now() - RETENTION_WINDOW;
  const nextEntries = Object.entries(data).reduce<Record<string, AppNotification[]>>(
    (acc, [appId, list]) => {
      const cleaned = [...list]
        .filter(item => item.date >= cutoff)
        .sort((a, b) => b.date - a.date)
        .slice(0, MAX_PER_APP);

      if (cleaned.length > 0) {
        acc[appId] = cleaned;
      }
      return acc;
    },
    {},
  );

  return nextEntries;
};

const loadNotifications = (): Record<string, AppNotification[]> => {
  if (!safeLocalStorage) return {};

  try {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, AppNotification[]>;
    return pruneNotifications(parsed);
  } catch (error) {
    console.warn('Failed to parse stored notifications', error);
    safeLocalStorage?.removeItem(STORAGE_KEY);
    return {};
  }
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);
export const NotificationCenter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Record<string, AppNotification[]>>(
    () => loadNotifications(),
  );
  const [activeFilter, setActiveFilter] = useState<string>(FILTER_ALL_KEY);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputId = useId();
  const [focusZone, setFocusZone] = useState<'filters' | 'notifications'>('filters');
  const [focusedFilterIndex, setFocusedFilterIndex] = useState(0);
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedColumn, setFocusedColumn] = useState(0);
  const filterRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const notificationRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());
  const hasAutoFocused = useRef(false);

  const persistNotifications = useCallback((next: Record<string, AppNotification[]>) => {
    const pruned = pruneNotifications(next);
    try {
      if (!safeLocalStorage) return pruned;
      if (Object.keys(pruned).length === 0) {
        safeLocalStorage.removeItem(STORAGE_KEY);
      } else {
        safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
      }
    } catch (error) {
      console.warn('Failed to persist notifications', error);
    }
    return pruned;
  }, []);

  const pushNotification = useCallback(
    (appId: string, message: string) => {
      const now = Date.now();
      setNotifications(prev => {
        const list = prev[appId] ?? [];
        const next = {
          ...prev,
          [appId]: [
            {
              id: `${now}-${Math.random().toString(16).slice(2)}`,
              message,
              date: now,
            },
            ...list,
          ],
        };
        return persistNotifications(next);
      });
    },
    [persistNotifications],
  );

  const clearNotifications = useCallback(
    (appId?: string) => {
      setNotifications(prev => {
        if (!appId) {
          if (Object.keys(prev).length === 0) return prev;
          safeLocalStorage?.removeItem(STORAGE_KEY);
          return {};
        }
        if (!prev[appId]) return prev;
        const next = { ...prev };
        delete next[appId];
        return persistNotifications(next);
      });
    },
    [persistNotifications],
  );

  useEffect(() => {
    if (activeFilter !== FILTER_ALL_KEY && !notifications[activeFilter]) {
      setActiveFilter(FILTER_ALL_KEY);
    }
  }, [activeFilter, notifications]);

  useEffect(() => {
    setFocusedRow(0);
    setFocusedColumn(0);
  }, [activeFilter, searchQuery]);

  const totalCount = useMemo(
    () => Object.values(notifications).reduce((sum, list) => sum + list.length, 0),
    [notifications],
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { [FILTER_ALL_KEY]: totalCount };
    for (const [appId, list] of Object.entries(notifications)) {
      result[appId] = list.length;
    }
    return result;
  }, [notifications, totalCount]);

  const filterKeys = useMemo(() => {
    const appIds = Object.keys(notifications).sort((a, b) => a.localeCompare(b));
    return [FILTER_ALL_KEY, ...appIds];
  }, [notifications]);

  useEffect(() => {
    setFocusedFilterIndex(prev => Math.min(prev, filterKeys.length - 1));
  }, [filterKeys.length]);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }),
    [],
  );

  const searchTerm = searchQuery.trim().toLowerCase();
  const appEntries = useMemo(
    () =>
      Object.keys(notifications)
        .sort((a, b) => a.localeCompare(b))
        .map(appId => ({ appId, notifications: notifications[appId] ?? [] })),
    [notifications],
  );

  const filteredEntries = useMemo(() => {
    return appEntries
      .filter(entry => activeFilter === FILTER_ALL_KEY || entry.appId === activeFilter)
      .map(entry => ({
        appId: entry.appId,
        notifications: entry.notifications.filter(notification =>
          notification.message.toLowerCase().includes(searchTerm),
        ),
      }))
      .filter(entry => entry.notifications.length > 0);
  }, [activeFilter, appEntries, searchTerm]);

  const filteredCount = useMemo(
    () => filteredEntries.reduce((sum, entry) => sum + entry.notifications.length, 0),
    [filteredEntries],
  );

  useEffect(() => {
    if (focusZone !== 'notifications') return;
    if (filteredEntries.length === 0) {
      setFocusZone('filters');
      return;
    }
    const boundedRow = Math.min(focusedRow, filteredEntries.length - 1);
    const maxColumn = Math.max(filteredEntries[boundedRow].notifications.length - 1, 0);
    const boundedColumn = Math.min(focusedColumn, maxColumn);
    if (boundedRow !== focusedRow) {
      setFocusedRow(boundedRow);
    }
    if (boundedColumn !== focusedColumn) {
      setFocusedColumn(boundedColumn);
    }
  }, [filteredEntries, focusZone, focusedColumn, focusedRow]);

  useEffect(() => {
    if (!hasAutoFocused.current) {
      hasAutoFocused.current = true;
      return;
    }

    if (focusZone === 'filters') {
      const key = filterKeys[focusedFilterIndex] ?? FILTER_ALL_KEY;
      const node = filterRefs.current[key];
      node?.focus();
    } else {
      const row = filteredEntries[focusedRow];
      if (!row) return;
      const notification = row.notifications[focusedColumn];
      if (!notification) return;
      const node = notificationRefs.current.get(notification.id);
      node?.focus();
    }
  }, [filterKeys, filteredEntries, focusZone, focusedColumn, focusedFilterIndex, focusedRow]);

  const summaryText = useMemo(() => {
    if (totalCount === 0) return 'No notifications';
    if (filteredCount === totalCount) {
      return `${totalCount} notification${totalCount === 1 ? '' : 's'}`;
    }
    return `${filteredCount} of ${totalCount} notifications`;
  }, [filteredCount, totalCount]);

  const focusFilterAt = useCallback((index: number) => {
    setFocusZone('filters');
    setFocusedFilterIndex(index);
  }, []);

  const focusNotificationAt = useCallback((rowIndex: number, columnIndex: number) => {
    setFocusZone('notifications');
    setFocusedRow(rowIndex);
    setFocusedColumn(columnIndex);
  }, []);

  const handleFilterKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = (index + 1) % filterKeys.length;
        focusFilterAt(nextIndex);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const nextIndex = (index - 1 + filterKeys.length) % filterKeys.length;
        focusFilterAt(nextIndex);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (filteredEntries.length === 0) return;
        focusNotificationAt(0, 0);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (filteredEntries.length === 0) return;
        const lastRow = filteredEntries.length - 1;
        const maxColumn = Math.max(filteredEntries[lastRow].notifications.length - 1, 0);
        focusNotificationAt(lastRow, Math.min(focusedColumn, maxColumn));
      }
    },
    [filteredEntries, filterKeys.length, focusFilterAt, focusNotificationAt, focusedColumn],
  );

  const handleNotificationKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLLIElement>, rowIndex: number, columnIndex: number) => {
      const rowCount = filteredEntries.length;
      if (rowCount === 0) return;
      const columnCount = filteredEntries[rowIndex]?.notifications.length ?? 0;
      if (columnCount === 0) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextColumn = (columnIndex + 1) % columnCount;
        focusNotificationAt(rowIndex, nextColumn);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const nextColumn = (columnIndex - 1 + columnCount) % columnCount;
        focusNotificationAt(rowIndex, nextColumn);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextRow = (rowIndex + 1) % rowCount;
        const nextRowLength = filteredEntries[nextRow]?.notifications.length ?? 0;
        const nextColumn = Math.min(columnIndex, Math.max(nextRowLength - 1, 0));
        focusNotificationAt(nextRow, nextColumn);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextRow = (rowIndex - 1 + rowCount) % rowCount;
        const nextRowLength = filteredEntries[nextRow]?.notifications.length ?? 0;
        const nextColumn = Math.min(columnIndex, Math.max(nextRowLength - 1, 0));
        focusNotificationAt(nextRow, nextColumn);
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        focusNotificationAt(rowIndex, 0);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        focusNotificationAt(rowIndex, columnCount - 1);
      }
    },
    [filteredEntries, focusNotificationAt],
  );
  return (
    <NotificationsContext.Provider
      value={{ notifications, pushNotification, clearNotifications }}
    >
      {children}
      <div className="notification-center" role="region" aria-label="Notification center">
        <header className="notification-toolbar">
          <div className="notification-toolbar-row" role="toolbar" aria-label="Notification filters">
            <div className="notification-filters">
              {filterKeys.map((key, index) => {
                const isActive = activeFilter === key;
                const label = key === FILTER_ALL_KEY ? 'All apps' : key;
                const count = counts[key] ?? 0;
                const inTabOrder =
                  focusZone === 'filters' ? focusedFilterIndex === index : index === 0;
                const tabIndex = inTabOrder ? 0 : -1;
                const buttonClass = `notification-filter${
                  isActive ? ' notification-filter--active' : ''
                }`;

                return (
                  <button
                    key={key}
                    type="button"
                    className={buttonClass}
                    aria-pressed={isActive}
                    aria-label={`${label} (${count})`}
                    tabIndex={tabIndex}
                    data-filter-key={key}
                    onClick={() => {
                      setActiveFilter(key);
                      focusFilterAt(index);
                    }}
                    onFocus={() => focusFilterAt(index)}
                    onKeyDown={event => handleFilterKeyDown(event, index)}
                    ref={node => {
                      if (node) {
                        filterRefs.current[key] = node;
                      } else {
                        delete filterRefs.current[key];
                      }
                    }}
                  >
                    <span className="notification-filter-label">{label}</span>
                    <span className="notification-filter-count" aria-hidden="true">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="notification-toolbar-row notification-toolbar-row--controls">
            <div className="notification-search">
              <label className="sr-only" htmlFor={searchInputId}>
                Filter notifications by keyword
              </label>
              <input
                id={searchInputId}
                type="search"
                className="notification-search-input"
                placeholder="Search notifications"
                aria-label="Filter notifications by keyword"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="notification-clear-all"
              onClick={() => clearNotifications()}
              disabled={totalCount === 0}
              aria-label="Clear all notifications"
            >
              Clear all
            </button>
          </div>
          <p className="notification-summary" role="status" aria-live="polite">
            {summaryText}
          </p>
        </header>
        <div className="notification-groups" role="list">
          {filteredEntries.length === 0 ? (
            <p className="notification-empty">
              {totalCount === 0
                ? 'No notifications yet.'
                : 'No notifications match the current filters.'}
            </p>
          ) : (
            filteredEntries.map((entry, rowIndex) => (
              <section
                key={entry.appId}
                className="notification-group"
                role="listitem"
                aria-label={`${entry.appId} notifications`}
                data-testid={`notification-group-${entry.appId}`}
              >
                <div className="notification-group-header">
                  <h3 className="notification-group-title">{entry.appId}</h3>
                  <div className="notification-group-actions">
                    <span className="notification-group-count" aria-hidden="true">
                      {entry.notifications.length}
                    </span>
                    <button
                      type="button"
                      className="notification-group-clear"
                      onClick={() => clearNotifications(entry.appId)}
                      aria-label={`Clear ${entry.appId} notifications`}
                      data-testid={`clear-app-${entry.appId}`}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <ul className="notification-list" role="list">
                  {entry.notifications.map((notification, columnIndex) => {
                    const isTabStop =
                      focusZone === 'notifications'
                        ? focusedRow === rowIndex && focusedColumn === columnIndex
                        : rowIndex === 0 && columnIndex === 0;
                    const tabIndex = isTabStop ? 0 : -1;
                    const isActiveItem =
                      focusZone === 'notifications' &&
                      focusedRow === rowIndex &&
                      focusedColumn === columnIndex;
                    const itemClass = `notification-item${
                      isActiveItem ? ' notification-item--active' : ''
                    }`;

                    return (
                      <li
                        key={notification.id}
                        className={itemClass}
                        tabIndex={tabIndex}
                        role="listitem"
                        data-testid="notification-item"
                        data-app-id={entry.appId}
                        onFocus={() => focusNotificationAt(rowIndex, columnIndex)}
                        onKeyDown={event => handleNotificationKeyDown(event, rowIndex, columnIndex)}
                        ref={node => {
                          if (node) {
                            notificationRefs.current.set(notification.id, node);
                          } else {
                            notificationRefs.current.delete(notification.id);
                          }
                        }}
                      >
                        <div className="notification-item-content">
                          <p className="notification-message">{notification.message}</p>
                          <time
                            className="notification-timestamp"
                            dateTime={new Date(notification.date).toISOString()}
                          >
                            {timeFormatter.format(notification.date)}
                          </time>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </NotificationsContext.Provider>
  );
};

export default NotificationCenter;
