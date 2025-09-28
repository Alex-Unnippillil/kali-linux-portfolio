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
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const panelId = `${headingId}-panel`;

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
      notifications.map(notification => ({
        ...notification,
        formattedTime: new Date(notification.timestamp).toISOString(),
        readableTime: timeFormatter.format(new Date(notification.timestamp)),
      })),
    [notifications, timeFormatter],
  );

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
        className="relative mx-1 flex h-9 w-9 items-center justify-center rounded-md border border-transparent bg-transparent text-[var(--kali-text)] transition focus-visible:ring-2 focus-visible:ring-[var(--kali-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] hover:bg-[var(--kali-panel-highlight)]"
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
          <span className="absolute -top-1.5 -right-1.5 min-w-[1.5rem] rounded-full px-1 text-center text-[0.65rem] font-semibold leading-5 text-white" style={{ background: 'var(--kali-blue)' }}>
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
          className="absolute right-0 z-50 mt-2 w-72 max-h-96 overflow-hidden rounded-md border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/95 text-[var(--kali-text)] shadow-xl backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-[var(--kali-panel-border)] px-4 py-2">
            <h2 id={headingId} className="text-sm font-semibold" style={{ color: 'var(--kali-text)' }}>
              Notifications
            </h2>
            <button
              type="button"
              onClick={handleDismissAll}
              disabled={notifications.length === 0}
              className="text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: 'var(--kali-blue)' }}
            >
              Dismiss all
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm opacity-80" style={{ color: 'var(--kali-text)' }}>
                You&apos;re all caught up.
              </p>
            ) : (
              <ul role="list" className="divide-y divide-[var(--kali-panel-border)]">
                {formattedNotifications.map(notification => (
                  <li key={notification.id} className="px-4 py-3 text-sm" style={{ color: 'var(--kali-text)' }}>
                    <p className="font-medium" style={{ color: 'var(--kali-text)' }}>{notification.title}</p>
                    {notification.body && (
                      <p className="mt-1 text-xs opacity-80" style={{ color: 'var(--kali-text)' }}>
                        {notification.body}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[0.65rem] uppercase tracking-wide opacity-70" style={{ color: 'var(--kali-text)' }}>
                      <span>{notification.appId}</span>
                      <time dateTime={notification.formattedTime}>{notification.readableTime}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

