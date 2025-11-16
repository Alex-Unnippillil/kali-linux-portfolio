import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number | null;
}

const FIRST_RUN_TOAST_STORAGE_KEY = 'kali:first-run-toast-dismissed';

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
    if (duration === null) {
      return () => undefined;
    }

    timeoutRef.current = setTimeout(() => {
      onClose && onClose();
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration, onClose]);

  const handleClick = useCallback(() => {
    onAction && onAction();
  }, [onAction]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed top-4 left-1/2 -translate-x-1/2 transform bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md flex flex-wrap items-center gap-3 transition-transform duration-150 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <span className="text-sm leading-snug">{message}</span>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={handleClick}
          className="ml-auto rounded bg-gray-700 px-3 py-1 text-sm font-medium focus:outline-none focus-visible:ring focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const FirstRunToast: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(FIRST_RUN_TOAST_STORAGE_KEY);
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FIRST_RUN_TOAST_STORAGE_KEY, 'true');
    }
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <Toast
      message="Tip: Press Ctrl+Space for the command palette, drag windows to the screen edge to snap, and press ? for keyboard shortcuts."
      actionLabel="Got it"
      onAction={handleDismiss}
      onClose={handleDismiss}
      duration={null}
    />
  );
};

export { FIRST_RUN_TOAST_STORAGE_KEY };

export default Toast;
