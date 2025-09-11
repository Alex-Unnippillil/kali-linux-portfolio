import React, { useEffect, useRef, useState } from 'react';

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] shadow-[0_4px_12px_4px_color-mix(in_srgb,var(--color-inverse),transparent_80%)] p-3 md:p-4 rounded-md flex items-center transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <span>{message}</span>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="ml-4 underline focus:outline-none text-[var(--color-text)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default Toast;
