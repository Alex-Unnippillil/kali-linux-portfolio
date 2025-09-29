import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
}) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (event: MediaQueryList | MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    updatePreference(mediaQuery);

    const listener = (event: MediaQueryListEvent) => updatePreference(event);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(listener);
    }
    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', listener);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(listener);
      }
    };
  }, []);

  const animationDuration = useMemo(() => (prefersReducedMotion ? 0 : 200), [prefersReducedMotion]);

  const finalizeClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    clearTimers();
    if (animationDuration === 0) {
      finalizeClose();
      return;
    }
    setVisible(false);
    exitTimeoutRef.current = setTimeout(finalizeClose, animationDuration);
  }, [animationDuration, clearTimers, finalizeClose]);

  useEffect(() => {
    setVisible(true);
    if (duration && duration > 0) {
      timeoutRef.current = setTimeout(handleClose, duration);
    }
    return () => {
      clearTimers();
    };
  }, [clearTimers, duration, handleClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[1000] flex flex-col items-center gap-3 px-4">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto mt-4 flex min-h-[3.25rem] w-full max-w-md items-center gap-4 rounded-md border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white shadow-md transition-all ease-out ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
        style={{
          transitionDuration: `${animationDuration}ms`,
          willChange: 'transform, opacity',
        }}
      >
        <span className="flex-1 leading-snug">{message}</span>
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="whitespace-nowrap text-xs font-semibold underline underline-offset-2 transition-opacity hover:opacity-80 focus:outline-none"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="ml-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition-opacity hover:opacity-80 focus:outline-none"
          aria-label="Dismiss notification"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Toast;
