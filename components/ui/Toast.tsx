import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ToastProps {
  id: string;
  message: string;
  appId?: string;
  onDismiss: (id: string) => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  appId,
  onDismiss,
  duration = 5000,
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number | null>(null);
  const remainingRef = useRef(duration);
  const [hovering, setHovering] = useState(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (remainingRef.current <= 0) {
      onDismiss(id);
      return;
    }
    clearTimer();
    startRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      onDismiss(id);
    }, remainingRef.current);
  }, [clearTimer, id, onDismiss]);

  useEffect(() => {
    remainingRef.current = duration;
    startTimer();
    return () => {
      clearTimer();
    };
  }, [clearTimer, duration, startTimer]);

  const handleMouseEnter = () => {
    setHovering(true);
    if (startRef.current == null) return;
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  };

  const handleMouseLeave = () => {
    setHovering(false);
    if (remainingRef.current <= 0) {
      onDismiss(id);
      return;
    }
    startTimer();
  };

  const handleDismiss = () => {
    clearTimer();
    onDismiss(id);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="pointer-events-auto flex w-80 max-w-full items-start gap-3 rounded-md border border-gray-700 bg-gray-900/95 p-4 text-white shadow-lg backdrop-blur transition duration-150 ease-in-out"
    >
      <div className="flex-1 space-y-1">
        {appId && <p className="text-xs uppercase text-gray-400">{appId}</p>}
        <p className="text-sm leading-snug">{message}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={handleDismiss}
        className="rounded p-1 text-gray-400 transition hover:bg-gray-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-yellow"
      >
        <span aria-hidden="true">×</span>
      </button>
      {hovering && <span className="sr-only">Timer paused</span>}
    </div>
  );
};

export default Toast;
