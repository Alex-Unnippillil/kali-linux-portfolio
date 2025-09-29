import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { announceToLiveRegion } from '../../utils/fnd01LiveRegion';

type ToastTone = 'info' | 'error';

interface ToastProps {
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
}

const GLOBAL_DISMISS_KEYS = new Set(['Escape']);

const isTimedDuration = (duration: number | undefined) =>
  Number.isFinite(duration) && (duration ?? 0) > 0;

const Toast: React.FC<ToastProps> = ({
  message,
  tone = 'info',
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(duration);
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const dismissible = typeof onClose === 'function';
  const timed = dismissible && isTimedDuration(duration);
  const dismissHintId = useId();

  useFocusTrap(containerRef, Boolean(actionLabel && onAction));

  useEffect(() => {
    remainingRef.current = duration;
  }, [duration]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimer();
    onClose?.();
  }, [clearTimer, onClose]);

  const startTimer = useCallback(() => {
    if (!timed) return;
    clearTimer();
    startTimeRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onClose?.();
    }, remainingRef.current);
  }, [clearTimer, onClose, timed]);

  const pauseTimer = useCallback(() => {
    if (!timed || !timeoutRef.current || startTimeRef.current === null) return;
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  }, [clearTimer, timed]);

  const resumeTimer = useCallback(() => {
    if (!timed) return;
    if (remainingRef.current <= 0) {
      close();
      return;
    }
    startTimer();
  }, [close, startTimer, timed]);

  useEffect(() => {
    if (!timed) return;
    startTimer();
    return clearTimer;
  }, [clearTimer, startTimer, timed]);

  useEffect(() => {
    const cleanup = announceToLiveRegion(message, tone === 'error' ? 'assertive' : 'polite');
    return cleanup;
  }, [message, tone]);

  useEffect(() => {
    if (!dismissible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isWithinToast = target ? containerRef.current?.contains(target) : false;
      const isComboDismiss =
        (event.key === '.' || event.key === '>') && (event.ctrlKey || event.metaKey);
      if (isComboDismiss) {
        event.preventDefault();
        close();
        return;
      }
      if (!isWithinToast) return;
      if (GLOBAL_DISMISS_KEYS.has(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [close, dismissible]);

  const toneClasses = useMemo(
    () =>
      tone === 'error'
        ? 'bg-red-900 border-red-700'
        : 'bg-gray-900 border-gray-700',
    [tone],
  );

  const handleMouseEnter = useCallback(() => {
    pauseTimer();
  }, [pauseTimer]);

  const handleMouseLeave = useCallback(() => {
    resumeTimer();
  }, [resumeTimer]);

  const handleFocus = useCallback(() => {
    pauseTimer();
  }, [pauseTimer]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    resumeTimer();
  }, [resumeTimer]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!dismissible) return;
      if (GLOBAL_DISMISS_KEYS.has(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    },
    [close, dismissible],
  );

  const role = tone === 'error' ? 'alert' : 'status';
  const ariaLive = 'off';

  return (
    <div
      ref={containerRef}
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      data-tone={tone}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform text-white border px-4 py-3 rounded-md shadow-md flex items-center gap-4 transition-transform duration-150 ease-in-out motion-reduce:transition-none motion-reduce:duration-0 motion-reduce:transform-none ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } ${toneClasses}`.trim()}
    >
      <span>{message}</span>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          aria-describedby={dismissible ? dismissHintId : undefined}
          className="ml-2 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {actionLabel}
        </button>
      )}
      {dismissible && (
        <span id={dismissHintId} className="sr-only" aria-live="off">
          Press Escape or Control plus Period to dismiss
        </span>
      )}
    </div>
  );
};

export default Toast;
