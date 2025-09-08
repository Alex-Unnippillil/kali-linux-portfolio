import React, {
  createContext,
  useCallback,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { kaliTheme } from '../../styles/themes/kali';

interface ToastItem {
  id: number;
  message: string;
  duration: number;
  leaving?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

interface ToastContextValue {
  toast: (
    message: string,
    options?: {
      duration?: number;
      actionLabel?: string;
      onAction?: () => void;
      icon?: ReactNode;
    },
  ) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback(
    (
      message: string,
      options: {
        duration?: number;
        actionLabel?: string;
        onAction?: () => void;
        icon?: ReactNode;
      } = {},
    ) => {
      const id = ++counter.current;
      const duration = options.duration ?? 4000;
      setToasts(t => [
        ...t,
        {
          id,
          message,
          duration,
          actionLabel: options.actionLabel,
          onAction: options.onAction,
          icon: options.icon,
        },
      ]);
      setTimeout(() => {
        setToasts(t =>
          t.map(toast =>
            toast.id === id ? { ...toast, leaving: true } : toast,
          ),
        );
        setTimeout(() => remove(id), 300);
      }, duration);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-3 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`relative px-4 py-3 shadow-md transition-all duration-300 transform pointer-events-auto ${
              t.leaving
                ? 'opacity-0 blur-md translate-x-2'
                : 'opacity-100 blur-0 translate-x-0'
            }`}
            style={{
              background: kaliTheme.bubble.background,
              color: kaliTheme.bubble.text,
              border: `1px solid ${kaliTheme.bubble.border}`,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div className="flex items-center gap-2">
              {t.icon && <span className="shrink-0" aria-hidden="true">{t.icon}</span>}
              <span className="flex-1">{t.message}</span>
              {t.actionLabel && (
                <button
                  onClick={() => {
                    t.onAction?.();
                    remove(t.id);
                  }}
                  className="underline ml-2"
                >
                  {t.actionLabel}
                </button>
              )}
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="ml-2"
              >
                ×
              </button>
            </div>
            <div
              className="absolute left-0 bottom-0 h-0.5 bg-current"
              style={{
                animation: `toast-progress ${t.duration}ms linear forwards`,
              }}
            />
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
