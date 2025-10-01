"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import DOMPurify, { Config as DOMPurifyConfig } from 'dompurify';
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

const MAX_COLLAPSED_HEIGHT = 160;

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string) =>
  value
    .replace(/[&<>"']/g, char => ESCAPE_MAP[char] || char)
    .replace(/\n/g, '<br />');

const SANITIZE_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    'a',
    'strong',
    'em',
    'p',
    'span',
    'br',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'kbd',
    'blockquote',
    'img',
    's',
    'u',
    'small',
  ],
  ALLOWED_ATTR: [
    'href',
    'title',
    'target',
    'rel',
    'src',
    'alt',
    'width',
    'height',
    'aria-label',
    'role',
    'loading',
    'decoding',
    'referrerpolicy',
  ],
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  KEEP_CONTENT: true,
  USE_PROFILES: { html: true },
};

const sanitizeNotificationBody = (input: string): string => {
  if (!input) return '';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return escapeHtml(input);
  }

  try {
    const fragment = DOMPurify.sanitize(input, {
      ...SANITIZE_CONFIG,
      RETURN_DOM_FRAGMENT: true,
    }) as unknown as DocumentFragment;

    const container = document.createElement('div');
    container.append(fragment);

    container.querySelectorAll('a').forEach(anchor => {
      const href = anchor.getAttribute('href') ?? '';
      const isExternal = /^https?:\/\//i.test(href);
      if (!isExternal) return;

      if (!anchor.getAttribute('target')) {
        anchor.setAttribute('target', '_blank');
      }
      const relTokens = new Set(
        (anchor.getAttribute('rel') ?? '')
          .split(/\s+/)
          .map(token => token.trim())
          .filter(Boolean),
      );
      relTokens.add('noopener');
      relTokens.add('noreferrer');
      anchor.setAttribute('rel', Array.from(relTokens).join(' '));
    });

    container.querySelectorAll('img').forEach(img => {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      img.setAttribute('referrerpolicy', 'no-referrer');
      img.classList.add('notification-inline-image');

      const widthAttr = parseInt(img.getAttribute('width') ?? '', 10);
      const heightAttr = parseInt(img.getAttribute('height') ?? '', 10);

      if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr) && widthAttr > 0 && heightAttr > 0) {
        img.style.width = '100%';
        img.style.maxWidth = `${widthAttr}px`;
        img.style.height = 'auto';
        img.style.aspectRatio = `${widthAttr} / ${heightAttr}`;
      } else {
        img.setAttribute('width', '320');
        img.setAttribute('height', '180');
        img.dataset.notificationPlaceholder = 'true';
        img.style.width = '100%';
        img.style.height = 'auto';
      }
    });

    const html = container.innerHTML.trim();
    return html || escapeHtml(input);
  } catch (error) {
    return escapeHtml(input);
  }
};

const NotificationBody: React.FC<{ body: string }> = ({ body }) => {
  const sanitized = useMemo(() => sanitizeNotificationBody(body), [body]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [sanitized]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const updateOverflow = () => {
      if (!element) return;
      const isOverflowing = element.scrollHeight > MAX_COLLAPSED_HEIGHT + 8;
      setOverflowing(isOverflowing);
    };

    updateOverflow();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateOverflow());
      observer.observe(element);
      return () => observer.disconnect();
    }

    const handleResize = () => updateOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sanitized]);

  if (!sanitized) return null;

  return (
    <div className="relative mt-1 text-xs text-ubt-grey text-opacity-80">
      <div
        ref={contentRef}
        className={`whitespace-pre-wrap leading-relaxed transition-[max-height] duration-200 ease-in-out [&_a]:text-sky-300 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-sky-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-black/50 [&_pre]:p-3 [&_.notification-inline-image]:mx-auto [&_.notification-inline-image]:my-2 [&_.notification-inline-image]:max-w-full [&_.notification-inline-image]:rounded-md [&_.notification-inline-image]:border [&_.notification-inline-image]:border-white/10 [&_.notification-inline-image]:bg-white/5 [&_.notification-inline-image[data-notification-placeholder='true']]:min-h-[8rem] ${
          expanded ? 'max-h-none' : 'max-h-40 overflow-hidden'
        }`}
        style={!expanded ? { maxHeight: `${MAX_COLLAPSED_HEIGHT}px` } : undefined}
        dangerouslySetInnerHTML={{ __html: sanitized }}
        suppressHydrationWarning
      />
      {!expanded && overflowing && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"
          aria-hidden="true"
        />
      )}
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="mt-2 text-[0.65rem] font-semibold uppercase tracking-wide text-sky-300 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

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
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={headingId}
          tabIndex={-1}
          className="absolute right-0 z-50 mt-2 w-72 max-h-96 overflow-hidden rounded-md border border-white/10 bg-ub-grey/95 text-ubt-grey shadow-xl backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <h2 id={headingId} className="text-sm font-semibold text-white">
              Notifications
            </h2>
            <button
              type="button"
              onClick={handleDismissAll}
              disabled={notifications.length === 0}
              className="text-xs font-medium text-ubb-orange transition disabled:cursor-not-allowed disabled:text-ubt-grey disabled:text-opacity-50"
            >
              Dismiss all
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ubt-grey text-opacity-80">
                You&apos;re all caught up.
              </p>
            ) : (
              <div>
                {groupedNotifications.map(group => {
                  const collapsed =
                    collapsedGroups[group.priority] ?? group.metadata.defaultCollapsed;
                  const contentId = `${panelId}-${group.priority}-group`;
                  return (
                    <section key={group.priority} className="border-b border-white/10 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.priority)}
                        aria-expanded={!collapsed}
                        aria-controls={contentId}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-white transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
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
                          {group.notifications.map(notification => (
                            <li
                              key={notification.id}
                              className={`border-l-2 px-4 py-3 text-sm text-white ${notification.metadata.accentClass}`}
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
                              {notification.body && <NotificationBody body={notification.body} />}
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey text-opacity-70">
                                <span>{notification.appId}</span>
                                <time dateTime={notification.formattedTime}>{notification.readableTime}</time>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

