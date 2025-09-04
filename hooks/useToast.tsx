"use client";

import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/ui/Toast';
import usePersistentState from './usePersistentState';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextType {
  notify: (msg: string) => void;
  log: ToastItem[];
  dnd: boolean;
  setDnd: (value: boolean) => void;
}

const ToastContext = createContext<ToastContextType>({
  notify: () => {},
  log: [],
  dnd: false,
  setDnd: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [log, setLog] = usePersistentState<ToastItem[]>("toast-log", []);
  const [dnd, setDnd] = usePersistentState<boolean>("toast-dnd", false);
  const [visible, setVisible] = useState<ToastItem[]>([]);

  const notify = (message: string) => {
    const item = { id: Date.now(), message };
    setLog((prev) => [...prev, item]);
    if (!dnd) {
      setVisible((prev) => [...prev, item]);
    }
  };

  const remove = (id: number) => {
    setVisible((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ notify, log, dnd, setDnd }}>
      {children}
      {visible.map((t, i) => (
        <Toast key={t.id} message={t.message} onClose={() => remove(t.id)} offset={16 + i * 56} />
      ))}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

