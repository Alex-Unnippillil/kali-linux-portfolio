import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
  announceAs?: 'status' | 'alert';
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
  announceAs = 'status',
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  const clearTimer = useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const scheduleClose = useCallback(
    (delay: number) => {
      if (!onClose) return;
      clearTimer();
      remainingTimeRef.current = delay;
      startTimeRef.current = Date.now();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onClose();
      }, delay);
    },
    [clearTimer, onClose],
  );

  const pauseTimer = useCallback(() => {
    if (!timeoutRef.current || startTimeRef.current === null) return;
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(
      0,
      remainingTimeRef.current - elapsed,
    );
    startTimeRef.current = null;
    clearTimer();
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (!onClose || timeoutRef.current) return;
    if (remainingTimeRef.current <= 0) {
      onClose();
      return;
    }
    scheduleClose(remainingTimeRef.current);
  }, [onClose, scheduleClose]);

  useEffect(() => {
    setVisible(true);
    remainingTimeRef.current = duration;
    if (onClose) {
      scheduleClose(duration);
    }
    return () => {
      clearTimer();
    };
  }, [clearTimer, duration, onClose, scheduleClose]);

  const handleFocus = useCallback(() => {
    pauseTimer();
  }, [pauseTimer]);

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (
        event.currentTarget.contains(event.relatedTarget as Node | null)
      ) {
        return;
      }
      resumeTimer();
    },
    [resumeTimer],
  );

  const liveRegionRole = announceAs === 'alert' ? 'alert' : 'status';
  const liveRegionPoliteness = announceAs === 'alert' ? 'assertive' : 'polite';

  return (
    <div
      role={liveRegionRole}
      aria-live={liveRegionPoliteness}
      aria-atomic="true"
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md flex items-center transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <span>{message}</span>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          type="button"
          aria-label={actionLabel}
          className="ml-4 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default Toast;
