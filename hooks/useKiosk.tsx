import { createContext, ReactNode, useContext } from 'react';
import { useRouter } from 'next/router';

const KioskContext = createContext(false);

export function KioskProvider({ children }: { children: ReactNode }) {
  const { query } = useRouter();
  const isKiosk = query.kiosk === '1';
  return <KioskContext.Provider value={isKiosk}>{children}</KioskContext.Provider>;
}

export const useKiosk = () => useContext(KioskContext);

