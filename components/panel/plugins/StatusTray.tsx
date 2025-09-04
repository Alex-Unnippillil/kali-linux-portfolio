'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type TrayContext = {
  /** Register a tray icon. */
  registerIcon: (id: string, icon: ReactNode) => void;
  /** Remove a tray icon. */
  unregisterIcon: (id: string) => void;
};

const StatusTrayContext = createContext<TrayContext | null>(null);

export function useStatusTray(): TrayContext {
  const ctx = useContext(StatusTrayContext);
  if (!ctx) {
    throw new Error('useStatusTray must be used within <StatusTray>');
  }
  return ctx;
}

export default function StatusTray({ children }: { children?: ReactNode }) {
  const [icons, setIcons] = useState<Record<string, ReactNode>>({});

  const registerIcon = (id: string, icon: ReactNode) => {
    setIcons((prev) => ({ ...prev, [id]: icon }));
  };

  const unregisterIcon = (id: string) => {
    setIcons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <StatusTrayContext.Provider value={{ registerIcon, unregisterIcon }}>
      <div className="flex items-center gap-1 px-2 bg-ub-cool-grey border border-ubt-cool-grey rounded-sm">
        {Object.entries(icons).map(([id, icon]) => (
          <div key={id} className="w-tray-icon h-tray-icon flex items-center justify-center">
            {icon}
          </div>
        ))}
        {children}
      </div>
    </StatusTrayContext.Provider>
  );
}

