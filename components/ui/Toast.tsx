import React, { useCallback, useEffect, useRef, useState } from 'react';

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
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visible, setVisible] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    setVisible(true);
    closeTimeoutRef.current = setTimeout(() => {
      handleClose();
    }, duration);
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [duration, handleClose]);

  const handleTransitionEnd = () => {
    if (!visible) {
      onClose && onClose();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform border px-4 py-3 shadow-md flex items-center transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{
        background: 'var(--bubble-bg)',
        color: 'var(--bubble-text)',
        borderColor: 'var(--bubble-border)',
        borderRadius: 'var(--bubble-radius)',
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <span>{message}</span>
      {onAction && actionLabel && (
        <button
          onClick={() => {
            onAction?.();
            handleClose();
          }}
          className="ml-4 underline focus:outline-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default Toast;
