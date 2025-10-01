"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNotifications,
  AppNotification,
  NotificationPriority,
} from '../../hooks/useNotifications';
import { PRIORITY_ORDER } from '../../utils/notifications/ruleEngine';

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const PRIORITY_METADATA: Record<
  NotificationPriority,
  {
    label: string;
    badgeClass: string;
    accentClass: string;
    defaultCollapsed: boolean;
    description: string;
  }
> = {
  critical: {
    label: 'Critical',
    badgeClass: 'bg-red-500 text-white',
    accentClass: 'border-red-500 bg-red-500/10',
    defaultCollapsed: false,
    description: 'Immediate action required alerts.',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-orange-500 text-white',
    accentClass: 'border-orange-400 bg-orange-500/10',
    defaultCollapsed: false,
    description: 'Important follow-up from active tools.',
  },
  normal: {
    label: 'Normal',
    badgeClass: 'bg-sky-500 text-white',
    accentClass: 'border-sky-400 bg-sky-500/5',
    defaultCollapsed: false,
    description: 'Routine updates and summaries.',
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-slate-600 text-white',
    accentClass: 'border-slate-600 bg-slate-500/10',
    defaultCollapsed: true,
    description: 'Verbose background chatter collapses by default.',
  },
};

const PAGE_SIZE = 25;

type PriorityMetadata = (typeof PRIORITY_METADATA)[NotificationPriority];

interface FormattedNotification extends AppNotification {
  formattedTime: string;
  readableTime: string;
  metadata: PriorityMetadata;
}

interface NotificationGroup {
  priority: NotificationPriority;
  metadata: PriorityMetadata;
  notifications: FormattedNotification[];
}

const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    clearNotifications,
    markAllRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const panelId = `${headingId}-panel`;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<NotificationPriority, boolean>>(
    () =>
      PRIORITY_ORDER.reduce(
        (acc, priority) => ({
          ...acc,
          [priority]: PRIORITY_METADATA[priority].defaultCollapsed,
        }),
        {} as Record<NotificationPriority, boolean>,
      ),
  );
  const [visibleByPriority, setVisibleByPriority] = useState<
    Record<NotificationPriority, number>
  >(() =>
    PRIORITY_ORDER.reduce(
      (acc, priority) => (
        (acc[priority] = PAGE_SIZE),
        acc
      ),
      {} as Record<NotificationPriority, number>,
    ),
  );

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      buttonRef.current?.focus({ preventScroll: true });
    }, 0);
  }, []);

  const togglePanel = useCallback(() => {
    setIsOpen(prev => {
      if (prev) {
        setTimeout(() => {
          buttonRef.current?.focus({ preventScroll: true });
        }, 0);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
      }
      if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>(focusableSelector),
        );
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      const panel = panelRef.current;
      const button = buttonRef.current;
      if (!panel || !button) return;
      if (panel.contains(target) || button.contains(target)) return;
      closePanel();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [closePanel, isOpen]);

  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasOpenedRef.current = false;
      return;
    }
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    const panel = panelRef.current;
    if (panel) {
      panel.focus({ preventScroll: true });
      const firstFocusable = panel.querySelector<HTMLElement>(focusableSelector);
      firstFocusable?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (notifications.some(notification => !notification.read)) {
      markAllRead();
    }
  }, [isOpen, markAllRead, notifications]);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    [],
  );

  const formattedNotifications = useMemo(
    () =>
      notifications.map<FormattedNotification>(notification => ({
        ...notification,
        formattedTime: new Date(notification.timestamp).toISOString(),
        readableTime: timeFormatter.format(new Date(notification.timestamp)),
        metadata: PRIORITY_METADATA[notification.priority],
      })),
    [notifications, timeFormatter],
  );

  const groupedNotifications = useMemo<NotificationGroup[]>(
    () =>
      PRIORITY_ORDER.map(priority => ({
        priority,
        metadata: PRIORITY_METADATA[priority],
        notifications: formattedNotifications.filter(
          notification => notification.priority === priority,
        ),
      })).filter(group => group.notifications.length > 0),
    [formattedNotifications],
  );

  useEffect(() => {
    setVisibleByPriority(prev => {
      const next = { ...prev } as Record<NotificationPriority, number>;
      PRIORITY_ORDER.forEach(priority => {
        const group = groupedNotifications.find(({ priority: p }) => p === priority);
        if (!group) {
          next[priority] = PAGE_SIZE;
          return;
        }
        const previous = prev?.[priority] ?? PAGE_SIZE;
        next[priority] = Math.min(
          group.notifications.length,
          Math.max(PAGE_SIZE, previous),
        );
      });
      return next;
    });
  }, [groupedNotifications]);

  const toggleGroup = useCallback((priority: NotificationPriority) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [priority]: !(prev?.[priority] ?? PRIORITY_METADATA[priority].defaultCollapsed),
    }));
  }, []);

  const handleDismissAll = useCallback(() => {
    if (notifications.length === 0) return;
    clearNotifications();
    closePanel();
  }, [clearNotifications, closePanel, notifications.length]);

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        aria-label="Open notifications"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={togglePanel}
        className="relative mx-1 flex h-9 w-9 items-center justify-center rounded-md border border-transparent bg-transparent text-ubt-grey transition focus:border-ubb-orange focus:outline-none focus:ring-0 hover:bg-white hover:bg-opacity-10"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 2a4 4 0 00-4 4v1.09c0 .471-.158.93-.45 1.3L4.3 10.2A1 1 0 005 11.8h10a1 1 0 00.7-1.6l-1.25-1.81a2 2 0 01-.45-1.3V6a4 4 0 00-4-4z" />
          <path d="M7 12a3 3 0 006 0H7z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[1.5rem] rounded-full bg-ubb-orange px-1 text-center text-[0.65rem] font-semibold leading-5 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={closePanel}
          />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col">
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              tabIndex={-1}
              className="flex h-full flex-col overflow-hidden border-l border-white/10 bg-ub-grey/95 text-ubt-grey shadow-2xl backdrop-blur"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <h2 id={headingId} className="text-base font-semibold text-white">
                    Notifications
                  </h2>
                  <p className="text-xs text-ubt-grey text-opacity-80">
                    Review alerts without leaving your workspace.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDismissAll}
                    disabled={notifications.length === 0}
                    className="text-xs font-medium text-ubb-orange transition disabled:cursor-not-allowed disabled:text-ubt-grey disabled:text-opacity-50"
                  >
                    Dismiss all
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ubt-grey transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
                    aria-label="Close notifications"
                  >
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 8.586l4.95-4.95a1 1 0 111.414 1.415L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414L8.586 10l-4.95-4.95A1 1 0 115.05 3.636L10 8.586z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-ubt-grey text-opacity-80">
                    You&apos;re all caught up.
                  </p>
                ) : (
                  <div>
                    {groupedNotifications.map(group => {
                      const collapsed =
                        collapsedGroups[group.priority] ?? group.metadata.defaultCollapsed;
                      const contentId = `${panelId}-${group.priority}-group`;
                      const visibleCount = visibleByPriority[group.priority] ?? PAGE_SIZE;
                      const visibleNotifications = group.notifications.slice(0, visibleCount);
                      const hasMore = visibleCount < group.notifications.length;

                      return (
                        <section key={group.priority} className="border-b border-white/10 last:border-b-0">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.priority)}
                            aria-expanded={!collapsed}
                            aria-controls={contentId}
                            className="flex w-full items-center justify-between px-6 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
                          >
                            <span className="flex items-center gap-2">
                              {group.metadata.label}
                              <span
                                className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${group.metadata.badgeClass}`}
                                title={group.metadata.description}
                              >
                                {group.notifications.length}
                              </span>
                            </span>
                            <svg
                              aria-hidden="true"
                              focusable="false"
                              className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-0' : 'rotate-90'}`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M7 5l6 5-6 5V5z" />
                            </svg>
                          </button>
                          <div
                            id={contentId}
                            role="region"
                            aria-hidden={collapsed}
                            hidden={collapsed}
                            className="bg-transparent"
                          >
                            <ul role="list" className="divide-y divide-white/10">
                              {visibleNotifications.map(notification => (
                                <li
                                  key={notification.id}
                                  className={`border-l-2 px-6 py-3 text-sm text-white ${notification.metadata.accentClass}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">{notification.title}</p>
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${notification.metadata.badgeClass}`}
                                      title={
                                        notification.classification.matchedRuleId
                                          ? `Priority ${notification.metadata.label} (${notification.classification.source}: ${notification.classification.matchedRuleId})`
                                          : `Priority ${notification.metadata.label}`
                                      }
                                    >
                                      {notification.metadata.label}
                                    </span>
                                  </div>
                                  {notification.body && (
                                    <p className="mt-1 whitespace-pre-line text-xs text-ubt-grey text-opacity-80">
                                      {notification.body}
                                    </p>
                                  )}
                                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey text-opacity-70">
                                    <span>{notification.appId}</span>
                                    <time dateTime={notification.formattedTime}>{notification.readableTime}</time>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            {hasMore && (
                              <div className="flex justify-center border-t border-white/5 bg-ub-grey/90 px-6 py-3">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-ubb-orange transition hover:text-ubb-orange/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
                                  onClick={() =>
                                    setVisibleByPriority(prev => ({
                                      ...prev,
                                      [group.priority]: Math.min(
                                        group.notifications.length,
                                        (prev[group.priority] ?? PAGE_SIZE) + PAGE_SIZE,
                                      ),
                                    }))
                                  }
                                >
                                  Load more
                                  <span className="sr-only"> {group.metadata.label} notifications</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

