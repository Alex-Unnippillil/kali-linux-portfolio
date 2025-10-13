'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import { getDirection, resolveLocale } from '../utils/direction';

type DirectionContextValue = {
  locale: string;
  direction: 'ltr' | 'rtl';
  isRtl: boolean;
};

const DirectionContext = createContext<DirectionContextValue>({
  locale: 'en',
  direction: 'ltr',
  isRtl: false,
});

export function useLocaleDirection(): DirectionContextValue {
  return useContext(DirectionContext);
}

export function LocaleDirectionProvider({ children }: { children: ReactNode }): JSX.Element {
  const router = useContext(RouterContext);
  const locale = router?.locale ?? null;
  const defaultLocale = router?.defaultLocale ?? null;

  const browserLocale =
    typeof navigator !== 'undefined'
      ? navigator.languages?.[0] ?? navigator.language ?? null
      : null;

  const normalizedLocale = useMemo(
    () =>
      resolveLocale({
        locale,
        defaultLocale,
        navigatorLocale: browserLocale,
      }),
    [browserLocale, defaultLocale, locale],
  );

  const direction = useMemo(() => getDirection(normalizedLocale), [normalizedLocale]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!root) return;
    root.setAttribute('dir', direction);
    root.setAttribute('lang', normalizedLocale);
    root.dataset.localeDirection = direction;
  }, [direction, normalizedLocale]);

  const contextValue = useMemo(
    () => ({
      locale: normalizedLocale,
      direction,
      isRtl: direction === 'rtl',
    }),
    [direction, normalizedLocale],
  );

  return <DirectionContext.Provider value={contextValue}>{children}</DirectionContext.Provider>;
}
