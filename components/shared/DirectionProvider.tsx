import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { getDirectionFromLocale, TextDirection } from '../../lib/direction';

interface DirectionContextValue {
  dir: TextDirection;
  isRTL: boolean;
  locale?: string;
}

const DirectionContext = createContext<DirectionContextValue>({
  dir: 'ltr',
  isRTL: false,
  locale: undefined,
});

interface Props {
  children: React.ReactNode;
}

export const DirectionProvider: React.FC<Props> = ({ children }) => {
  const { locale, defaultLocale } = useRouter();
  const documentLocale =
    typeof document !== 'undefined' ? document.documentElement.lang : undefined;
  const navigatorLocale =
    typeof navigator !== 'undefined'
      ? navigator.language || navigator.languages?.[0]
      : undefined;
  const effectiveLocale = locale ?? documentLocale ?? defaultLocale ?? navigatorLocale;

  const [dir, setDir] = useState<TextDirection>(() =>
    getDirectionFromLocale(effectiveLocale, 'ltr'),
  );

  useEffect(() => {
    const docLocale =
      typeof document !== 'undefined' ? document.documentElement.lang : undefined;
    const navLocale =
      typeof navigator !== 'undefined'
        ? navigator.language || navigator.languages?.[0]
        : undefined;
    const nextLocale = locale ?? docLocale ?? defaultLocale ?? navLocale;
    setDir((prev) => {
      const nextDir = getDirectionFromLocale(nextLocale, prev);
      return nextDir;
    });
  }, [locale, defaultLocale]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('dir', dir);
    if (effectiveLocale) {
      root.setAttribute('lang', effectiveLocale);
    }
  }, [dir, effectiveLocale]);

  const value = useMemo(
    () => ({ dir, isRTL: dir === 'rtl', locale: effectiveLocale }),
    [dir, effectiveLocale],
  );

  return (
    <DirectionContext.Provider value={value}>{children}</DirectionContext.Provider>
  );
};

export const useDirection = (): DirectionContextValue => useContext(DirectionContext);
