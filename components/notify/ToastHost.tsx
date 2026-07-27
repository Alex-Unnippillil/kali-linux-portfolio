"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ToastItem {
  id: number;
  message: string;
  duration: number;
}

interface ToastContextValue {
  push: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastHost");
  return ctx.push;
};

const Toast: React.FC<{
  toast: ToastItem;
  onRemove: (id: number) => void;
}> = ({ toast, onRemove }) => {
  const { id, message, duration } = toast;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(duration);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => onRemove(id), remainingRef.current);
  }, [id, onRemove]);

  useEffect(() => {
    start();
    return clear;
  }, [start, clear]);

  const handleMouseEnter = () => {
    remainingRef.current -= Date.now() - startRef.current;
    clear();
  };

  const handleMouseLeave = () => {
    start();
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="bg-gray-900 text-white border border-gray-700 px-4 py-3 rounded-md shadow-md"
    >
      {message}
    </div>
  );
};

const ToastHost: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message: string, duration: number = 4000) => {
    setToasts((t) => [
      ...t,
      { id: Date.now() + Math.random(), message, duration },
    ]);
  }, []);

  const contextValue = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-2 right-2 flex flex-col items-end space-y-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastHost;
