import React, { useEffect, useRef, useState } from 'react';
import { telemetryStore } from '../../lib/telemetryStore';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
  level?: 'info' | 'warn' | 'error';
  source?: string;
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
  level = 'info',
  source,
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visible, setVisible] = useState(false);
  const lastLoggedMessage = useRef<string | null>(null);

  useEffect(() => {
    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onClose]);

  useEffect(() => {
    if (!telemetryStore.enabled) return;
    if (!message) return;
    if (lastLoggedMessage.current === message) return;
    lastLoggedMessage.current = message;
    telemetryStore.logToast(message, {
      actionLabel,
      level,
      source,
    });
  }, [actionLabel, level, message, source]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md flex items-center transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <span>{message}</span>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="ml-4 underline focus:outline-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default Toast;
