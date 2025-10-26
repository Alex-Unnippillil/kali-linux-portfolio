"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AppNotification, NotificationPriority } from '../../hooks/useNotifications';
import { useNotifications } from '../../hooks/useNotifications';
import { PRIORITY_ORDER } from '../../utils/notifications/ruleEngine';
import type { NotificationFilters } from '../../utils/notifications/filtering';
import { applyNotificationFilters, defaultFilters } from '../../utils/notifications/filtering';

const STORAGE_KEY = 'notification-center:filters';

const PRIORITY_METADATA: Record<
  NotificationPriority,
  {
    label: string;
    badgeClass: string;
    accentClass: string;
    description: string;
  }
> = {
  critical: {
    label: 'Critical',
    badgeClass: 'bg-red-500 text-white',
    accentClass: 'border-red-500 bg-red-500/10',
    description: 'Immediate action required alerts.',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-orange-500 text-white',
    accentClass: 'border-orange-400 bg-orange-500/10',
    description: 'Important follow-up from active tools.',
  },
  normal: {
    label: 'Normal',
    badgeClass: 'bg-sky-500 text-white',
    accentClass: 'border-sky-400 bg-sky-500/5',
    description: 'Routine updates and summaries.',
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-slate-600 text-white',
    accentClass: 'border-slate-600 bg-slate-500/10',
    description: 'Verbose background chatter collapses by default.',
  },
};

type PriorityMetadata = (typeof PRIORITY_METADATA)[NotificationPriority];

interface GroupedNotification extends AppNotification {
  metadata: PriorityMetadata;
  formattedTime: string;
  readableTime: string;
}

interface AppGroup {
  appId: string;
  notifications: GroupedNotification[];
}

interface PriorityGroup {
  priority: NotificationPriority;
  metadata: PriorityMetadata;
  apps: AppGroup[];
}

export interface NotificationCenterPanelProps {
  id: string;
  headingId: string;
  onClose: () => void;
  className?: string;
}

const ensureValidFilters = (
  filters: NotificationFilters,
  availableApps: string[],
): NotificationFilters => {
  if (filters.appId !== 'all' && !availableApps.includes(filters.appId)) {
    return { ...filters, appId: 'all' };
  }
  return filters;
};

const NotificationCenterPanel = forwardRef<HTMLDivElement, NotificationCenterPanelProps>(
  ({ id, headingId, onClose, className }, ref) => {
    const {
      notifications,
      markAllRead,
      dismissNotification,
    } = useNotifications();

    const priorityFilterId = useId();
    const appFilterId = useId();
    const unreadFilterId = useId();
    const unreadFilterLabelId = `${unreadFilterId}-label`;

    const listContainerRef = useRef<HTMLDivElement | null>(null);

    const [filters, setFilters] = useState<NotificationFilters>(() => {
      if (typeof window === 'undefined') return defaultFilters;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) return defaultFilters;
        const parsed = JSON.parse(stored) as NotificationFilters;
        return { ...defaultFilters, ...parsed };
      } catch (error) {
        console.warn('Failed to read notification filters from storage', error);
        return defaultFilters;
      }
    });

    const availableApps = useMemo(() => {
      const unique = new Set<string>();
      notifications.forEach(notification => unique.add(notification.appId));
      return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [notifications]);

    useEffect(() => {
      setFilters(prev => ensureValidFilters(prev, availableApps));
    }, [availableApps]);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (error) {
        console.warn('Failed to persist notification filters', error);
      }
    }, [filters]);

    const timeFormatter = useMemo(
      () =>
        new Intl.DateTimeFormat(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
      [],
    );

    const filteredNotifications = useMemo(
      () => applyNotificationFilters(notifications, filters),
      [notifications, filters],
    );

    const formattedNotifications = useMemo(() => {
      return filteredNotifications.map<GroupedNotification>(notification => ({
        ...notification,
        metadata: PRIORITY_METADATA[notification.priority],
        formattedTime: new Date(notification.timestamp).toISOString(),
        readableTime: timeFormatter.format(new Date(notification.timestamp)),
      }));
    }, [filteredNotifications, timeFormatter]);

    const groupedNotifications = useMemo<PriorityGroup[]>(() => {
      return PRIORITY_ORDER.map(priority => {
        const candidates = formattedNotifications.filter(
          notification => notification.priority === priority,
        );
        if (candidates.length === 0) {
          return null;
        }
        const appsMap = new Map<string, GroupedNotification[]>();
        candidates.forEach(notification => {
          if (!appsMap.has(notification.appId)) {
            appsMap.set(notification.appId, []);
          }
          appsMap.get(notification.appId)?.push(notification);
        });
        const apps: AppGroup[] = Array.from(appsMap.entries())
          .map(([appId, notificationsForApp]) => ({
            appId,
            notifications: notificationsForApp,
          }))
          .sort((a, b) => a.appId.localeCompare(b.appId));
        return {
          priority,
          metadata: PRIORITY_METADATA[priority],
          apps,
        };
      }).filter((group): group is PriorityGroup => Boolean(group));
    }, [formattedNotifications]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
      setSelectedIds(prev => {
        if (prev.size === 0) return prev;
        const next = new Set<string>();
        const knownIds = new Set(notifications.map(notification => notification.id));
        prev.forEach(id => {
          if (knownIds.has(id)) {
            next.add(id);
          }
        });
        return next.size === prev.size ? prev : next;
      });
    }, [notifications]);

    const notificationsById = useMemo(() => {
      const map = new Map<string, AppNotification>();
      notifications.forEach(notification => {
        map.set(notification.id, notification);
      });
      return map;
    }, [notifications]);

    const hasUnread = filteredNotifications.some(notification => !notification.read);

    const toggleSelection = useCallback((id: string) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    const selectAll = useCallback(() => {
      setSelectedIds(new Set(filteredNotifications.map(notification => notification.id)));
    }, [filteredNotifications]);

    const clearSelection = useCallback(() => {
      setSelectedIds(new Set());
    }, []);

    const dismissSelected = useCallback(() => {
      setSelectedIds(prev => {
        if (prev.size === 0) return prev;
        const toDismiss = Array.from(prev);
        toDismiss.forEach(id => {
          const notification = notificationsById.get(id);
          if (!notification) return;
          dismissNotification(notification.appId, notification.id);
        });
        return new Set();
      });
    }, [dismissNotification, notificationsById]);

    const handleMarkAllRead = useCallback(() => {
      if (filters.appId === 'all') {
        markAllRead();
        return;
      }
      markAllRead(filters.appId);
    }, [filters.appId, markAllRead]);

    const handlePriorityChange = useCallback<
      React.ChangeEventHandler<HTMLSelectElement>
    >(
      event => {
        const value = event.target.value as NotificationFilters['priority'];
        setFilters(prev => ({ ...prev, priority: value }));
      },
      [],
    );

    const handleAppChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
      event => {
        const value = event.target.value as NotificationFilters['appId'];
        setFilters(prev => ({ ...prev, appId: value }));
      },
      [],
    );

    const handleUnreadChange = useCallback<
      React.ChangeEventHandler<HTMLInputElement>
    >(
      event => {
        const value = event.target.checked;
        setFilters(prev => ({ ...prev, unreadOnly: value }));
      },
      [],
    );

    const createItemKeyDownHandler = useCallback(
      (id: string) => (event: React.KeyboardEvent<HTMLLIElement>) => {
        const container = listContainerRef.current;
        if (!container) return;
        const focusableItems = Array.from(
          container.querySelectorAll<HTMLElement>('[data-notification-item="true"]'),
        );
        const currentIndex = focusableItems.indexOf(event.currentTarget);
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const next = focusableItems[currentIndex + 1] ?? focusableItems[0];
          next?.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const next =
            currentIndex - 1 >= 0
              ? focusableItems[currentIndex - 1]
              : focusableItems[focusableItems.length - 1];
          next?.focus();
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          toggleSelection(id);
        }
      },
      [toggleSelection],
    );

    const panelClassName =
      className ??
      'absolute right-0 z-50 mt-2 w-80 max-h-[28rem] overflow-hidden rounded-md border border-white/10 bg-ub-grey/95 text-ubt-grey shadow-xl backdrop-blur';

    return (
      <div
        ref={ref}
        id={id}
        role="dialog"
        aria-modal="false"
        aria-labelledby={headingId}
        tabIndex={-1}
        className={panelClassName}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex flex-col gap-1">
            <h2 id={headingId} className="text-sm font-semibold text-white">
              Notification Center
            </h2>
            <p className="text-xs text-ubt-grey text-opacity-80">
              Filter, triage, and dismiss updates from your tools.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-transparent p-1 text-ubt-grey transition hover:border-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
          >
            <span className="sr-only">Close notification center</span>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2 text-xs text-ubt-grey">
          <label className="flex flex-col gap-1" htmlFor={priorityFilterId}>
            <span className="font-medium text-white">Priority</span>
            <select
              id={priorityFilterId}
              value={filters.priority}
              onChange={handlePriorityChange}
              className="rounded border border-white/10 bg-transparent px-2 py-1 text-sm text-white focus:border-ubb-orange focus:outline-none"
            >
              <option value="all">All priorities</option>
              {PRIORITY_ORDER.map(priority => (
                <option key={priority} value={priority}>
                  {PRIORITY_METADATA[priority].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1" htmlFor={appFilterId}>
            <span className="font-medium text-white">App</span>
            <select
              id={appFilterId}
              value={filters.appId}
              onChange={handleAppChange}
              className="rounded border border-white/10 bg-transparent px-2 py-1 text-sm text-white focus:border-ubb-orange focus:outline-none"
            >
              <option value="all">All apps</option>
              {availableApps.map(appId => (
                <option key={appId} value={appId}>
                  {appId}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2 rounded border border-transparent px-2 py-1 text-sm text-white transition hover:border-white/20">
            <input
              type="checkbox"
              id={unreadFilterId}
              aria-labelledby={unreadFilterLabelId}
              checked={filters.unreadOnly}
              onChange={handleUnreadChange}
              className="h-4 w-4 rounded border border-white/20 bg-ub-grey text-ubb-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
            />
            <label
              id={unreadFilterLabelId}
              htmlFor={unreadFilterId}
              className="cursor-pointer text-sm text-white"
            >
              Unread only
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-2 text-xs text-ubt-grey">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={!hasUnread}
              className="rounded border border-ubb-orange px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ubb-orange transition disabled:cursor-not-allowed disabled:border-white/10 disabled:text-ubt-grey disabled:text-opacity-60 hover:bg-ubb-orange hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={dismissSelected}
              disabled={selectedIds.size === 0}
              className="rounded border border-red-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-400 transition disabled:cursor-not-allowed disabled:border-white/10 disabled:text-ubt-grey disabled:text-opacity-60 hover:bg-red-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Dismiss selected
            </button>
            <button
              type="button"
              onClick={selectAll}
              disabled={filteredNotifications.length === 0}
              className="rounded border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:border-white/10 disabled:text-ubt-grey disabled:text-opacity-60 hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
              className="rounded border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:border-white/10 disabled:text-ubt-grey disabled:text-opacity-60 hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
            >
              Clear selection
            </button>
          </div>
          <p className="text-[0.65rem] text-ubt-grey text-opacity-70">
            {filteredNotifications.length === 0
              ? 'No notifications match the current filters.'
              : `${filteredNotifications.length} notification${
                  filteredNotifications.length === 1 ? '' : 's'
                } visible · ${selectedIds.size} selected`}
          </p>
        </div>

        <div
          ref={listContainerRef}
          className="max-h-80 overflow-y-auto px-2 py-2"
          role="presentation"
        >
          {filteredNotifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-ubt-grey text-opacity-80">
              Adjust the filters or check back later. You are all caught up.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {groupedNotifications.map(group => (
                <section
                  key={group.priority}
                  aria-label={`${group.metadata.label} priority notifications`}
                  className="rounded-md border border-white/10"
                >
                  <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span>{group.metadata.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${group.metadata.badgeClass}`}
                        title={group.metadata.description}
                      >
                        {group.apps.reduce((sum, app) => sum + app.notifications.length, 0)}
                      </span>
                    </div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-ubt-grey text-opacity-60">
                      {group.metadata.description}
                    </p>
                  </header>
                  <div className="flex flex-col divide-y divide-white/10">
                    {group.apps.map(appGroup => (
                      <div key={`${group.priority}-${appGroup.appId}`} className="flex flex-col gap-2 px-2 py-2">
                        <div className="flex items-center justify-between gap-2 px-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-ubt-grey text-opacity-80">
                            {appGroup.appId}
                          </h3>
                          <span className="text-[0.65rem] text-ubt-grey text-opacity-60">
                            {appGroup.notifications.length} item{appGroup.notifications.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <ul role="list" className="flex flex-col gap-2">
                          {appGroup.notifications.map(notification => {
                            const isSelected = selectedIds.has(notification.id);
                            return (
                              <li
                                key={notification.id}
                                role="listitem"
                                tabIndex={0}
                                data-notification-item="true"
                                onKeyDown={createItemKeyDownHandler(notification.id)}
                                className={`flex flex-col gap-2 rounded-md border-l-4 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange ${notification.metadata.accentClass} ${
                                  isSelected ? 'ring-2 ring-ubb-orange/60' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 h-4 w-4 rounded border border-white/40 bg-ub-grey text-ubb-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
                                      checked={isSelected}
                                      onChange={() => toggleSelection(notification.id)}
                                      aria-label={`Select notification ${notification.title}`}
                                      onClick={event => event.stopPropagation()}
                                    />
                                    <div>
                                      <p className="font-medium">{notification.title}</p>
                                      {notification.body && (
                                        <p className="mt-1 whitespace-pre-line text-xs text-ubt-grey text-opacity-80">
                                          {notification.body}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${notification.metadata.badgeClass}`}
                                  >
                                    {notification.metadata.label}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey text-opacity-70">
                                  <span>{notification.appId}</span>
                                  <time dateTime={notification.formattedTime}>{notification.readableTime}</time>
                                  {!notification.read && (
                                    <span className="font-semibold text-ubb-orange">Unread</span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);

NotificationCenterPanel.displayName = 'NotificationCenterPanel';

export default NotificationCenterPanel;
