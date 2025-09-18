import React, { useContext, useEffect, useRef, useState } from 'react';
import { FocusModeContext } from '../../hooks/useFocusMode';

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
  const [visible, setVisible] = useState(false);
  const focusMode = useContext(FocusModeContext);
  const suppress = Boolean(
    focusMode?.isFocusModeActive && focusMode?.settings.quietToasts
  );

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (suppress) {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onClose, suppress]);

  if (suppress) {
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
