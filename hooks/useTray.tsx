import { createContext, useContext, useState, ReactNode } from 'react';

export interface TrayIcon {
  id: string;
  sni?: string;
  legacy: string;
  tooltip?: string;
}

interface TrayContextValue {
  icons: TrayIcon[];
  register: (icon: TrayIcon) => void;
  unregister: (id: string) => void;
}

const TrayContext = createContext<TrayContextValue>({
  icons: [],
  register: () => {},
  unregister: () => {},
});

export function TrayProvider({ children }: { children: ReactNode }) {
  const [icons, setIcons] = useState<TrayIcon[]>([]);

  const register = (icon: TrayIcon) => {
    setIcons((prev) => {
      const filtered = prev.filter((i) => i.id !== icon.id);
      return [...filtered, icon];
    });
  };

  const unregister = (id: string) => {
    setIcons((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <TrayContext.Provider value={{ icons, register, unregister }}>
      {children}
    </TrayContext.Provider>
  );
}

export function useTray() {
  return useContext(TrayContext);
}
