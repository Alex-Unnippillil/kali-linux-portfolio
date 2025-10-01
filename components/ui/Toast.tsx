import React, { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
  count?: number;
  isActionPending?: boolean;
  actionAvailable?: boolean;
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
  count = 1,
  isActionPending = false,
  actionAvailable = Boolean(onAction),
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [count, duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`w-full transform rounded-md border border-gray-700 bg-gray-900 px-4 py-3 text-white shadow-md transition-all duration-150 ease-in-out ${visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span>{message}</span>
          {count > 1 && (
            <span
              className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-gray-700 px-2 py-0.5 text-xs font-semibold"
              aria-label={`${count} notifications`}
            >
              {count}
            </span>
          )}
        </div>
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            disabled={!actionAvailable || isActionPending}
            aria-disabled={!actionAvailable || isActionPending}
            className={`whitespace-nowrap underline focus:outline-none ${!actionAvailable || isActionPending ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            {isActionPending ? 'Working…' : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
