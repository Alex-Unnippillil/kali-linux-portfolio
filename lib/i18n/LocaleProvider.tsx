'use client';

import type { ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { I18nextProvider } from 'react-i18next';
import { activateLocale, getI18n } from './config';
import { AVAILABLE_LOCALES, detectLocale } from './detector';
import { DEFAULT_LOCALE, DEFAULT_NAMESPACES } from './constants';
import { normalizeLocale, resolveLocalePath, serializeLocaleCookie } from './utils';

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: string;
  namespaces?: string[];
  initialResources?: Record<string, Record<string, unknown>>;
}

interface LocaleContextValue {
  locale: string;
  setLocale: (nextLocale: string) => Promise<void>;
  availableLocales: string[];
  loading: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: async () => {
    /* noop */
  },
  availableLocales: AVAILABLE_LOCALES,
  loading: false,
});

export const useLocale = (): LocaleContextValue => useContext(LocaleContext);

export function LocaleProvider({
  children,
  initialLocale,
  namespaces = Array.from(DEFAULT_NAMESPACES),
  initialResources,
}: LocaleProviderProps): JSX.Element {
  const router = useRouter();
  const initialResourcesRef = useRef(initialResources);
  const [locale, setLocaleState] = useState<string>(() => {
    if (initialLocale) return normalizeLocale(initialLocale);
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    const detection = detectLocale({ pathname: window.location.pathname });
    return detection.locale;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let canceled = false;
    const apply = async (): Promise<void> => {
      const store = initialResourcesRef.current;
      initialResourcesRef.current = undefined;
      try {
        await activateLocale(locale, namespaces, store);
        if (typeof document !== 'undefined') {
          document.cookie = serializeLocaleCookie(locale);
        }
      } catch (error) {
        console.error('Failed to activate locale', error);
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    void apply();

    return () => {
      canceled = true;
    };
  }, [locale, namespaces]);

  const handleLocaleChange = useCallback(
    async (nextLocale: string): Promise<void> => {
      const normalized = normalizeLocale(nextLocale);
      if (normalized === locale) return;
      setLoading(true);
      await activateLocale(normalized, namespaces);
      setLocaleState(normalized);
      if (typeof document !== 'undefined') {
        document.cookie = serializeLocaleCookie(normalized);
      }
      if (typeof window !== 'undefined') {
        const nextPath = resolveLocalePath(normalized, router.asPath);
        if (nextPath !== router.asPath) {
          void router.replace(nextPath, undefined, { shallow: true }).catch((error) => {
            console.error('Failed to update locale route', error);
          });
        }
      }
      setLoading(false);
    },
    [locale, namespaces, router],
  );

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale: handleLocaleChange,
    availableLocales: AVAILABLE_LOCALES,
    loading,
  }), [handleLocaleChange, locale, loading]);

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={getI18n()}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}
