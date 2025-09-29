'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Toast from './Toast';

const MAX_VISIBLE_TOASTS = 2;

const createToastId = () =>
  `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

export interface ToastContextValue {
  pushToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const queueRef = useRef(queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const pushToast = useCallback((options: ToastOptions) => {
    const toast: ToastItem = {
      id: createToastId(),
      message: options.message,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      duration: options.duration,
    };
    setQueue(prev => [...prev, toast]);
    return toast.id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setQueue(prev => {
      if (!prev.some(toast => toast.id === id)) return prev;
      return prev.filter(toast => toast.id !== id);
    });
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      const current = queueRef.current;
      if (!current.length) return;
      const [top] = current;
      if (!top) return;
      dismissToast(top.id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismissToast, queue.length]);

  const visibleToasts = queue.slice(0, MAX_VISIBLE_TOASTS);

  const value = useMemo(
    () => ({
      pushToast,
      dismissToast,
    }),
    [pushToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visibleToasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          duration={toast.duration}
          onClose={() => dismissToast(toast.id)}
          style={{
            top: `${16 + index * 84}px`,
            zIndex: 1100 + (visibleToasts.length - index),
          }}
        />
      ))}
    </ToastContext.Provider>
  );
};

export type { ToastOptions };

export default ToastProvider;
