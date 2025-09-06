import React, { useEffect, useRef, useState } from 'react';
import { kaliTheme } from '../../styles/themes/kali';

interface ToastProps {
  message?: string;
  title?: string;
  body?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  title,
  body,
  icon,
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
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform px-4 py-3 shadow-md flex items-center transition-transform duration-300 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{
        background: kaliTheme.bubble.background,
        color: kaliTheme.bubble.text,
        border: `1px solid ${kaliTheme.bubble.border}`,
        borderRadius: 'var(--radius-md)',
      }}
    >
      {icon && <img src={icon} alt="" className="w-4 h-4 mr-2" />}
      <div className="flex flex-col">
        {title && <strong className="font-semibold">{title}</strong>}
        <span>{body ?? message}</span>
      </div>
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
