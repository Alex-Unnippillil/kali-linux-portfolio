import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastRecord } from './ToastProvider';

interface ToastProps {
  toast: ToastRecord;
  onClose: (id: string) => void;
}

const DEFAULT_DURATION = 6000;
const SWIPE_THRESHOLD = 80;

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef<number>(toast.duration ?? DEFAULT_DURATION);
  const startTimeRef = useRef(0);

  const close = useCallback(() => {
    onClose(toast.id);
  }, [onClose, toast.id]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (duration: number) => {
      clearTimer();
      if (!Number.isFinite(duration) || duration <= 0) {
        remainingRef.current = duration;
        return;
      }
      remainingRef.current = duration;
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        close();
      }, duration);
    },
    [clearTimer, close],
  );

  const pauseTimer = useCallback(() => {
    if (!timerRef.current) return;
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (!Number.isFinite(remainingRef.current) || remainingRef.current <= 0) return;
    startTimer(remainingRef.current);
  }, [startTimer]);

  useEffect(() => {
    setOffset(0);
    setIsDragging(false);
    pointerIdRef.current = null;

    const duration = toast.duration ?? DEFAULT_DURATION;
    if (!Number.isFinite(duration)) {
      clearTimer();
      remainingRef.current = duration;
      return () => {
        clearTimer();
      };
    }

    remainingRef.current = duration;
    startTimer(duration);

    return () => {
      clearTimer();
    };
  }, [toast.id, toast.visibleSince, toast.version, toast.duration, startTimer, clearTimer]);

  const finalizeSwipe = useCallback(
    (thresholdMet: boolean) => {
      if (thresholdMet) {
        close();
      } else {
        setOffset(0);
        resumeTimer();
      }
      setIsDragging(false);
      pointerIdRef.current = null;
    },
    [close, resumeTimer],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    setIsDragging(true);
    pauseTimer();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;
    const deltaX = event.clientX - startXRef.current;
    setOffset(deltaX);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    finalizeSwipe(Math.abs(offset) > SWIPE_THRESHOLD);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    finalizeSwipe(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      close();
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && toast.onAction) {
      event.preventDefault();
      toast.onAction();
      close();
    }
  };

  const handleActionClick = () => {
    toast.onAction?.();
    close();
  };

  const accentStyle = toast.meta?.averageColor
    ? { borderLeftColor: toast.meta.averageColor, borderLeftWidth: '4px' }
    : undefined;
  const translation = `translate3d(${offset}px, 0, 0)`;
  const opacity = 1 - Math.min(Math.abs(offset) / 200, 0.4);

  return (
    <li>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={0}
        className="pointer-events-auto flex w-full min-w-[16rem] max-w-full items-start gap-3 rounded-md border border-gray-700 bg-gray-900/95 p-4 text-sm text-white shadow-lg outline-none transition-[opacity,transform] focus:ring-2 focus:ring-blue-400"
        style={{
          transform: translation,
          opacity,
          ...accentStyle,
        }}
        title={toast.meta?.preview ?? toast.message}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        onMouseEnter={pauseTimer}
        onMouseLeave={() => {
          if (!isDragging) resumeTimer();
        }}
        onFocus={pauseTimer}
        onBlur={() => {
          if (!isDragging) resumeTimer();
        }}
        data-testid="toast"
      >
        <div className="flex flex-1 flex-col">
          <p className="font-medium leading-snug">{toast.message}</p>
          {toast.count > 1 && (
            <span
              className="mt-1 inline-flex items-center text-xs text-gray-300"
              aria-label={`${toast.count} similar notifications`}
            >
              ×{toast.count}
            </span>
          )}
        </div>
        {toast.actionLabel && (
          <button
            type="button"
            onClick={handleActionClick}
            className="ml-auto rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={close}
          className="ml-1 rounded p-1 text-gray-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </li>
  );
};

export default Toast;
