import React, { useEffect, useRef, useState } from 'react';
import { kaliTheme } from '../../styles/themes/kali';

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
  const closeRef = useRef<NodeJS.Timeout | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      closeRef.current = setTimeout(() => {
        onClose && onClose();
      }, 300);
    }, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (closeRef.current) clearTimeout(closeRef.current);
    };
  }, [duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform px-4 py-3 border border-100 shadow-100 flex items-center transition-transform duration-300 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{
        background: kaliTheme.bubble.background,
        color: kaliTheme.bubble.text,
        borderRadius: 'var(--radius-md)',
      }}
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
