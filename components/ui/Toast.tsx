import React, { useEffect, useRef, useState } from 'react';
import {
  NotificationPriority,
  shouldSilenceNotification,
  subscribeToFullscreenChanges,
} from '../../modules/desktop/fullscreenManager';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
  intent?: NotificationPriority;
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
  intent = 'default',
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visible, setVisible] = useState(false);
  const [silenced, setSilenced] = useState(() =>
    shouldSilenceNotification(intent),
  );
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return subscribeToFullscreenChanges(() => {
      setSilenced(shouldSilenceNotification(intent));
    });
  }, [intent]);

  useEffect(() => {
    if (silenced && !dismissedRef.current) {
      dismissedRef.current = true;
      onClose?.();
    }
  }, [silenced, onClose]);

  useEffect(() => {
    if (silenced) {
      return undefined;
    }

    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onClose, silenced]);

  if (silenced) {
    return null;
  }

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
