import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface VirtualDesktopContextValue {
  activeDesktop: number;
  assignments: Record<string, number>;
  desktops: number;
  switchDesktop: (index: number) => void;
  assignWindow: (id: string, desktop: number) => void;
  removeWindow: (id: string) => void;
}

export const VirtualDesktopContext = createContext<VirtualDesktopContextValue>({
  activeDesktop: 0,
  assignments: {},
  desktops: 1,
  switchDesktop: () => {},
  assignWindow: () => {},
  removeWindow: () => {},
});

export function VirtualDesktopProvider({ children, count = 4 }: { children: ReactNode; count?: number }) {
  const [activeDesktop, setActiveDesktop] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  const desktops = count;

  const switchDesktop = useCallback(
    (index: number) => {
      setActiveDesktop(() => {
        const next = ((index % desktops) + desktops) % desktops;
        return next;
      });
    },
    [desktops]
  );

  const assignWindow = useCallback((id: string, desktop: number) => {
    setAssignments((prev) => ({ ...prev, [id]: desktop }));
  }, []);

  const removeWindow = useCallback((id: string) => {
    setAssignments((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  return (
    <VirtualDesktopContext.Provider
      value={{ activeDesktop, assignments, desktops, switchDesktop, assignWindow, removeWindow }}
    >
      {children}
    </VirtualDesktopContext.Provider>
  );
}

export const useVirtualDesktops = () => useContext(VirtualDesktopContext);

