'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Shortcut } from '../data/shortcuts';

interface ShortcutsContextValue {
  appShortcuts: Shortcut[];
  setAppShortcuts: (s: Shortcut[]) => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue>({
  appShortcuts: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setAppShortcuts: () => {},
});

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [appShortcuts, setAppShortcuts] = useState<Shortcut[]>([]);
  return (
    <ShortcutsContext.Provider value={{ appShortcuts, setAppShortcuts }}>
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useRegisterShortcuts(shortcuts: Shortcut[]) {
  const { setAppShortcuts } = useContext(ShortcutsContext);
  useEffect(() => {
    setAppShortcuts(shortcuts);
    return () => setAppShortcuts([]);
  }, [shortcuts, setAppShortcuts]);
}

export function useShortcutsContext() {
  return useContext(ShortcutsContext);
}

export default useRegisterShortcuts;
