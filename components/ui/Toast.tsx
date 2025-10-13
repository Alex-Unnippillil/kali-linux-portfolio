import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

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

  const floatingStyles: (CSSProperties & { '--tw-translate-x'?: string }) = {
    insetInlineStart: '50%',
    '--tw-translate-x': '-50%',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 transform bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md flex items-center transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={floatingStyles}
    >
      <span>{message}</span>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="underline focus:outline-none"
          style={{ marginInlineStart: '1rem' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default Toast;
