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
  leaving?: boolean;
}

interface ToastContextValue {
  toast: (message: string, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, duration = 4000) => {
      const id = ++counter.current;
      setToasts(t => [...t, { id, message }]);
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
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`px-4 py-3 shadow-md transition-all duration-300 transform pointer-events-auto ${
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
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
