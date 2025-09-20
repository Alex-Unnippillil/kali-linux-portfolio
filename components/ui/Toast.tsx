import React, { useEffect, useRef, useState } from 'react';
import { useDesktop } from '../core/DesktopProvider';

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

  const { tokens } = useDesktop();

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
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform bg-gray-900 text-white border border-gray-700 rounded-md shadow-md flex items-center transition-transform duration-150 ease-in-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } ${tokens.control} ${tokens.inlineGap}`.trim()}
    >
      <span className={tokens.text}>{message}</span>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className={`underline focus:outline-none ${tokens.subtleText}`.trim()}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default Toast;
