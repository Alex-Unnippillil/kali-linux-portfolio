import React, { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onClose?: () => void;
  /**
   * Duration in milliseconds before the toast automatically closes.
   * Pass `null` to keep the toast visible until the user interacts.
   */
  duration?: number | null;
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    if (duration !== null) {
      timeoutRef.current = setTimeout(() => {
        onClose && onClose();
      }, duration);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onClose]);

  const hasPrimaryAction = Boolean(onAction && actionLabel);
  const hasSecondaryAction = Boolean(onSecondaryAction && secondaryActionLabel);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md flex items-center transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <span>{message}</span>
      {(hasPrimaryAction || hasSecondaryAction) && (
        <div className="ml-4 flex items-center gap-3">
          {hasPrimaryAction && (
            <button
              onClick={onAction}
              className="underline focus:outline-none"
            >
              {actionLabel}
            </button>
          )}
          {hasSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="underline focus:outline-none"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Toast;
