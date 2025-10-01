import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { NotificationPriority } from '../../utils/notifications/ruleEngine';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
  priority?: NotificationPriority;
}

const Toast: React.FC<ToastProps> = ({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 6000,
  priority = 'normal',
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const messageId = useId();

  const handleClose = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      handleClose();
    }, duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, handleClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handleClose();
      }
    };

    const node = containerRef.current;
    node?.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      node?.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  const isCritical = priority === 'critical';
  const role = isCritical ? 'alertdialog' : 'status';
  const ariaLive = isCritical ? 'assertive' : 'polite';

  return (
    <div
      ref={containerRef}
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      aria-labelledby={isCritical ? messageId : undefined}
      tabIndex={isCritical ? -1 : undefined}
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md flex items-center transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <span id={messageId}>{message}</span>
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
