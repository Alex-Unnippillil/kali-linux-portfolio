'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';

interface ToastOptions {
  duration?: number;
}

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number | null; // null = persist until dismissed
}

interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  longTask: (message: string) => () => void; // returns dismiss function
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 6000;

function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export const useSuccessToast = () => useToastContext().success;
export const useErrorToast = () => useToastContext().error;
export const useLongTaskToast = () => useToastContext().longTask;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, message: string, duration: number | null) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type, duration }]);
      if (duration) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove],
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) => {
      add('success', message, options?.duration ?? DEFAULT_DURATION);
    },
    [add],
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => {
      add('error', message, options?.duration ?? DEFAULT_DURATION);
    },
    [add],
  );

  const longTask = useCallback(
    (message: string) => {
      const id = add('info', message, null);
      return () => remove(id);
    },
    [add, remove],
  );

  return (
    <ToastContext.Provider value={{ success, error, longTask }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 space-y-2 z-50">
        {toasts.map((t) => (
          <ToastView key={t.id} message={t.message} type={t.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastViewProps {
  message: string;
  type: ToastType;
}

function ToastView({ message, type }: ToastViewProps) {

  const typeClass =
    type === 'success'
      ? 'bg-green-600 border-green-500'
      : type === 'error'
        ? 'bg-red-600 border-red-500'
        : 'bg-gray-900 border-gray-700';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-md shadow-md text-white border px-4 py-3 flex items-center ${typeClass}`}
    >
      <span>{message}</span>
    </div>
  );
}

export default ToastProvider;
