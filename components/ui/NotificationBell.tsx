"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNotifications } from '../../hooks/useNotifications';

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    clearNotifications,
    markAllRead,
    dismissNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const panelId = `${headingId}-panel`;
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [liveMessage, setLiveMessage] = useState('');
  const announcedIdsRef = useRef<Set<string>>(new Set());
  const initializedAnnouncementsRef = useRef(false);

  const buttonLabel = useMemo(() => {
    if (unreadCount === 0) return 'Notifications, no unread messages';
    if (unreadCount === 1) return 'Notifications, 1 unread message';
    return `Notifications, ${unreadCount} unread messages`;
  }, [unreadCount]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
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
      notifications.map(notification => ({
        ...notification,
        formattedTime: new Date(notification.timestamp).toISOString(),
        readableTime: timeFormatter.format(new Date(notification.timestamp)),
      })),
    [notifications, timeFormatter],
  );

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;
      const totalItems = formattedNotifications.length;
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
        return;
      }
      if (totalItems === 0) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveIndex(prev => {
          if (prev === -1) return 0;
          return (prev + 1) % totalItems;
        });
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveIndex(prev => {
          if (prev === -1) return totalItems - 1;
          return (prev - 1 + totalItems) % totalItems;
        });
      } else if (event.key === 'Home') {
        event.preventDefault();
        setActiveIndex(totalItems > 0 ? 0 : -1);
      } else if (event.key === 'End') {
        event.preventDefault();
        setActiveIndex(totalItems > 0 ? totalItems - 1 : -1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (activeIndex >= 0) {
          event.preventDefault();
          menuItemRefs.current[activeIndex]?.click();
        }
      }
    },
    [activeIndex, closePanel, formattedNotifications.length],
  );

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(prev => {
      if (formattedNotifications.length === 0) return -1;
      if (prev === -1) return 0;
      if (prev >= formattedNotifications.length)
        return formattedNotifications.length - 1;
      return prev;
    });
  }, [formattedNotifications.length, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeIndex === -1) {
      panelRef.current?.focus({ preventScroll: true });
      return;
    }
    menuItemRefs.current[activeIndex]?.focus({ preventScroll: true });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!initializedAnnouncementsRef.current) {
      notifications.forEach(notification =>
        announcedIdsRef.current.add(notification.id),
      );
      initializedAnnouncementsRef.current = true;
      return;
    }

    const newNotifications = notifications.filter(
      notification => !announcedIdsRef.current.has(notification.id),
    );

    if (newNotifications.length === 0) return;

    newNotifications.forEach(notification =>
      announcedIdsRef.current.add(notification.id),
    );

    const summary = newNotifications
      .map(notification =>
        notification.body
          ? `${notification.title}: ${notification.body}`
          : notification.title,
      )
      .join('. ');

    const prefix =
      newNotifications.length === 1
        ? 'New notification:'
        : 'New notifications:';
    setLiveMessage(`${prefix} ${summary}`);
  }, [notifications]);

  const handleDismissAll = useCallback(() => {
    if (notifications.length === 0) return;
    clearNotifications();
    closePanel();
  }, [clearNotifications, closePanel, notifications.length]);

  const setMenuItemRef = useCallback((index: number, node: HTMLButtonElement | null) => {
    menuItemRefs.current[index] = node;
  }, []);

  const handleNotificationActivate = useCallback(
    (notification: (typeof formattedNotifications)[number]) => {
      dismissNotification(notification.appId, notification.id);
      closePanel();
    },
    [closePanel, dismissNotification],
  );

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        aria-label={buttonLabel}
        aria-haspopup="menu"
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
          role="menu"
          aria-labelledby={headingId}
          tabIndex={-1}
          className="absolute right-0 z-50 mt-2 w-72 max-h-96 overflow-hidden rounded-md border border-white/10 bg-ub-grey/95 text-ubt-grey shadow-xl backdrop-blur"
          onKeyDown={handleMenuKeyDown}
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
              <ul role="none" className="divide-y divide-white/10">
                {formattedNotifications.map((notification, index) => (
                  <li role="none" key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      ref={node => setMenuItemRef(index, node)}
                      tabIndex={activeIndex === index ? 0 : -1}
                      onClick={() => handleNotificationActivate(notification)}
                      onFocus={() => setActiveIndex(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full flex-col px-4 py-3 text-left text-sm text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                        activeIndex === index ? 'bg-white/10' : ''
                      }`}
                    >
                      <span className="font-medium">{notification.title}</span>
                      {notification.body && (
                        <span className="mt-1 text-xs text-ubt-grey text-opacity-80">
                          {notification.body}
                        </span>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[0.65rem] uppercase tracking-wide text-ubt-grey text-opacity-70">
                        <span>{notification.appId}</span>
                        <time dateTime={notification.formattedTime}>{notification.readableTime}</time>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
};

export default NotificationBell;

