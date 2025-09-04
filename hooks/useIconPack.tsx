import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DEFAULT_ICON_PACK, IconPack, loadIconPack } from '../utils/iconLoader';

interface IconPackContextValue {
  icons: IconPack;
  theme: string;
  setTheme: (theme: string) => void;
}

const IconPackContext = createContext<IconPackContextValue>({
  icons: DEFAULT_ICON_PACK,
  theme: 'Yaru',
  setTheme: () => {},
});

export function IconPackProvider({
  children,
  initialTheme = 'Yaru',
}: {
  children: ReactNode;
  initialTheme?: string;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [icons, setIcons] = useState<IconPack>(DEFAULT_ICON_PACK);

  useEffect(() => {
    let mounted = true;
    loadIconPack(theme).then((pack) => {
      if (mounted) {
        setIcons(pack);
      }
    });
    return () => {
      mounted = false;
    };
  }, [theme]);

  return (
    <IconPackContext.Provider value={{ icons, theme, setTheme }}>
      {children}
    </IconPackContext.Provider>
  );
}

export function useIconPack() {
  return useContext(IconPackContext);
}
