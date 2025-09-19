"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import baseMessages from '../locales/en.json';
import usePersistentState from './usePersistentState';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type LocaleMessages,
  type MessageDictionary,
  loadLocale,
  getLocaleLabels,
  getMessage,
} from '../utils/loadLocale';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  messages: LocaleMessages;
  t: (key: string, fallback?: string) => string;
  availableLocales: { code: SupportedLocale; label: string }[];
  isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const localeValidator = (value: unknown): value is SupportedLocale =>
  typeof value === 'string' && SUPPORTED_LOCALES.includes(value as SupportedLocale);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = usePersistentState<SupportedLocale>(
    'ui-locale',
    DEFAULT_LOCALE,
    localeValidator,
  );
  const [messages, setMessages] = useState<LocaleMessages>(baseMessages);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    loadLocale(locale)
      .then((loaded) => {
        if (active) {
          setMessages(loaded);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[i18n] Unable to load locale "${locale}"`, error);
        }
        if (active) {
          setMessages(baseMessages);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [locale]);

  const setLocale = useCallback(
    (nextLocale: SupportedLocale) => {
      setLocaleState(nextLocale);
    },
    [setLocaleState],
  );

  const translator = useMemo(
    () =>
      (key: string, fallback?: string) => {
        const value = getMessage(messages as unknown as MessageDictionary, key);
        if (typeof value === 'string') {
          return value;
        }
        if (fallback !== undefined) {
          return fallback;
        }
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[i18n] Missing translation key "${key}"`);
        }
        return key;
      },
    [messages],
  );

  const availableLocales = useMemo(
    () => {
      const labels = getLocaleLabels(messages);
      return SUPPORTED_LOCALES.map((code) => ({ code, label: labels[code] }));
    },
    [messages],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      messages,
      t: translator,
      availableLocales,
      isLoading,
    }),
    [availableLocales, isLoading, locale, messages, translator],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
