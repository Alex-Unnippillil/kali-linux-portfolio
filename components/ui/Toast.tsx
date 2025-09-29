import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ToastProps {
  title?: string;
  message: string;
  status?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  title,
  message,
  status,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
}) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const remainingRef = useRef(duration);
  const [visible, setVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remaining, setRemaining] = useState(duration);
  const [liveMessage, setLiveMessage] = useState('');

  const timedDismissalEnabled = useMemo(
    () => Boolean(onClose) && Number.isFinite(duration) && duration > 0,
    [duration, onClose],
  );

  const announcement = useMemo(
    () => [status, title, message].filter(Boolean).join('. '),
    [message, status, title],
  );

  const startTimer = useCallback(
    (time: number) => {
      if (!onClose || !Number.isFinite(time) || time <= 0) {
        if (time <= 0) onClose?.();
        return;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      remainingRef.current = time;
      setRemaining(time);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onClose();
      }, time);
    },
    [onClose],
  );

  useEffect(() => {
    setVisible(true);
  }, []);

  useEffect(() => {
    setLiveMessage(announcement);
  }, [announcement]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    remainingRef.current = duration;
    setRemaining(duration);
    setIsPaused(false);

    if (!timedDismissalEnabled) {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }

    startTimer(duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [duration, message, startTimer, timedDismissalEnabled, title, status]);

  const handleTogglePause = useCallback(() => {
    if (!timedDismissalEnabled) return;

    if (isPaused) {
      if (remainingRef.current <= 0) {
        onClose?.();
        return;
      }
      startTimer(remainingRef.current);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const startedAt = startTimeRef.current;
    if (startedAt) {
      const elapsed = Date.now() - startedAt;
      const nextRemaining = Math.max(remainingRef.current - elapsed, 0);
      remainingRef.current = nextRemaining;
      setRemaining(nextRemaining);
    }
    setIsPaused(true);
  }, [isPaused, onClose, startTimer, timedDismissalEnabled]);

  const showPauseControl = timedDismissalEnabled;
  const formattedCountdown = useMemo(() => {
    if (!showPauseControl || !Number.isFinite(remaining)) return null;
    return Math.ceil(remaining / 1000);
  }, [remaining, showPauseControl]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 transform rounded-md border border-gray-700 bg-gray-900 px-4 py-3 text-white shadow-md transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="toast-live-region"
      >
        {liveMessage}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        {title && <span className="font-semibold">{title}</span>}
        <span className="truncate" title={message}>
          {message}
        </span>
        {status && (
          <span className="text-xs text-gray-300" data-testid="toast-status">
            {status}
          </span>
        )}
        {showPauseControl && isPaused && formattedCountdown !== null && (
          <span className="text-xs text-gray-300" data-testid="toast-paused">
            Dismissal paused{formattedCountdown !== null ? ` with ${formattedCountdown}s remaining` : ''}
          </span>
        )}
      </div>
      <div className="ml-4 flex flex-shrink-0 items-center gap-3 text-sm">
        {onAction && actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="rounded border border-white/20 px-2 py-1 text-xs font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {actionLabel}
          </button>
        )}
        {showPauseControl && (
          <button
            type="button"
            onClick={handleTogglePause}
            aria-pressed={isPaused}
            aria-label={
              isPaused ? 'Resume toast auto-dismissal' : 'Pause toast auto-dismissal'
            }
            className="rounded border border-white/20 px-2 py-1 text-xs font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
