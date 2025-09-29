import React, { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onExtend?: (remainingMs: number) => void;
  duration?: number;
  extendBy?: number;
  pauseLabel?: string;
  resumeLabel?: string;
  extendLabel?: string;
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  onPause,
  onResume,
  onExtend,
  duration = 6000,
  extendBy = 4000,
  pauseLabel = 'Pause',
  resumeLabel = 'Resume',
  extendLabel = 'Extend',
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const remainingRef = useRef(duration);
  const focusPauseRef = useRef(false);
  const isPausedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remaining, setRemaining] = useState(duration);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const updateRemaining = (value: number) => {
    remainingRef.current = value;
    setRemaining(value);
  };

  const scheduleClose = (delay: number) => {
    clearTimer();
    if (delay <= 0) {
      onClose && onClose();
      return;
    }
    startTimeRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      onClose && onClose();
    }, delay);
  };

  const pauseToast = (source: 'focus' | 'manual' = 'manual') => {
    if (isPausedRef.current) {
      if (source === 'focus') {
        focusPauseRef.current = true;
      }
      return;
    }

    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const nextRemaining = Math.max(remainingRef.current - elapsed, 0);
      updateRemaining(nextRemaining);
    }

    clearTimer();
    startTimeRef.current = null;
    isPausedRef.current = true;
    setIsPaused(true);
    focusPauseRef.current = source === 'focus';
    onPause && onPause();
  };

  const resumeToast = () => {
    if (!isPausedRef.current || remainingRef.current <= 0) {
      return;
    }

    isPausedRef.current = false;
    setIsPaused(false);
    focusPauseRef.current = false;
    scheduleClose(remainingRef.current);
    onResume && onResume();
  };

  const extendToast = () => {
    const nextRemaining = remainingRef.current + extendBy;
    updateRemaining(nextRemaining);
    onExtend && onExtend(nextRemaining);

    if (!isPausedRef.current) {
      scheduleClose(nextRemaining);
    }
  };

  useEffect(() => {
    setVisible(true);
    isPausedRef.current = false;
    focusPauseRef.current = false;
    remainingRef.current = duration;
    setRemaining(duration);
    setIsPaused(false);
    scheduleClose(duration);

    return () => {
      clearTimer();
    };
  }, [duration, onClose]);

  const handleFocus = () => {
    pauseToast('focus');
  };

  const handleBlur = () => {
    if (focusPauseRef.current) {
      focusPauseRef.current = false;
      resumeToast();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      tabIndex={-1}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <span className="text-sm leading-snug sm:text-base">{message}</span>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="rounded border border-transparent bg-indigo-600 px-3 py-1 text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              {actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => pauseToast('manual')}
            disabled={isPaused}
            className="rounded border border-gray-600 px-3 py-1 transition hover:border-indigo-400 hover:text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pauseLabel}
          </button>
          <button
            type="button"
            onClick={resumeToast}
            disabled={!isPaused}
            className="rounded border border-gray-600 px-3 py-1 transition hover:border-indigo-400 hover:text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resumeLabel}
          </button>
          <button
            type="button"
            onClick={extendToast}
            className="rounded border border-gray-600 px-3 py-1 transition hover:border-indigo-400 hover:text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            {extendLabel}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-300" aria-hidden="true">
        {isPaused ? 'Paused' : `Closing in ${(remaining / 1000).toFixed(1)}s`}
      </p>
    </div>
  );
};

export default Toast;
