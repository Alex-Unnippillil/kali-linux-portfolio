import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import enMessages from '../data/locales/en.json';

type Messages = Record<string, unknown>;

const STORAGE_KEY = 'desktop-locale';

const SUPPORTED_LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['id'];

const LOCALE_OPTIONS = SUPPORTED_LOCALES.map((option) => ({
  id: option.id,
  label: option.label,
})) as readonly { id: LocaleCode; label: string }[];

const messageCache = new Map<LocaleCode, Messages>();
messageCache.set('en', enMessages as Messages);

const localeLoaders: Record<LocaleCode, () => Promise<Messages>> = {
  en: async () => enMessages as Messages,
  es: () => import('../data/locales/es.json').then((mod) => mod.default as Messages),
};

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (locale: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  isLoading: boolean;
  options: typeof LOCALE_OPTIONS;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function normalizeLocale(input?: string | null): LocaleCode {
  if (!input) return 'en';
  const candidate = input.toLowerCase();
  const direct = SUPPORTED_LOCALES.find((option) => option.id === candidate);
  if (direct) return direct.id;
  const base = candidate.split('-')[0];
  const fallback = SUPPORTED_LOCALES.find((option) => option.id === base);
  return fallback?.id ?? 'en';
}

async function loadMessages(locale: LocaleCode): Promise<Messages> {
  if (messageCache.has(locale)) {
    return messageCache.get(locale)!;
  }
  const loader = localeLoaders[locale];
  if (!loader) return messageCache.get('en')!;
  const result = await loader();
  messageCache.set(locale, result);
  return result;
}

function resolvePath(messages: Messages, key: string): unknown {
  return key.split('.').reduce<unknown>((accumulator, segment) => {
    if (accumulator && typeof accumulator === 'object' && segment in accumulator) {
      return (accumulator as Record<string, unknown>)[segment];
    }
    return undefined;
  }, messages);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const defaultLocale = normalizeLocale(process.env.NEXT_PUBLIC_DEFAULT_LOCALE);
  const [locale, setLocaleState] = useState<LocaleCode>(defaultLocale);
  const [messages, setMessages] = useState<Messages>(messageCache.get('en')!);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const pendingLocale = useRef<LocaleCode>(defaultLocale);
  const bootstrapped = useRef(false);

  const applyLocale = useCallback(
    async (nextLocale: LocaleCode, { persist = true }: { persist?: boolean } = {}) => {
      if (pendingLocale.current === nextLocale && !isLoading) {
        return;
      }
      pendingLocale.current = nextLocale;
      setIsLoading(true);
      try {
        const loaded = await loadMessages(nextLocale);
        if (pendingLocale.current !== nextLocale) return;
        setMessages(loaded);
        setLocaleState(nextLocale);
        if (persist && typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, nextLocale);
        }
      } catch (error) {
        console.error('Failed to load locale', error);
        if (pendingLocale.current !== nextLocale) return;
        setMessages(messageCache.get('en')!);
        setLocaleState('en');
        if (persist && typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, 'en');
        }
      } finally {
        if (pendingLocale.current === nextLocale) {
          setIsLoading(false);
        }
      }
    },
    [isLoading],
  );

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    let initial = defaultLocale;
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const navigatorLanguage = typeof window.navigator !== 'undefined' ? window.navigator.language : undefined;
      initial = normalizeLocale(stored ?? navigatorLanguage ?? defaultLocale);
    }
    applyLocale(initial, { persist: false }).catch((error) => {
      console.error('Failed to initialize locale', error);
      setIsLoading(false);
    });
  }, [applyLocale, defaultLocale]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  useEffect(() => {
    if (isLoading) return;
    const others = SUPPORTED_LOCALES.map((option) => option.id).filter((id) => id !== locale) as LocaleCode[];
    others.forEach((id) => {
      loadMessages(id).catch(() => {
        // Ignore prefetch errors
      });
    });
  }, [locale, isLoading]);

  const translate = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const message = resolvePath(messages, key) ?? resolvePath(messageCache.get('en')!, key);
      if (typeof message !== 'string') {
        return key;
      }
      if (!values) return message;
      return message.replace(/\{(\w+)\}/g, (match, token) => {
        const value = values[token];
        return value === undefined || value === null ? match : String(value);
      });
    },
    [messages],
  );

  const changeLocale = useCallback(
    (next: string) => {
      const normalized = normalizeLocale(next);
      applyLocale(normalized).catch((error) => {
        console.error('Unable to switch locale', error);
      });
    },
    [applyLocale],
  );

  const contextValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: changeLocale,
      t: translate,
      isLoading,
      options: LOCALE_OPTIONS,
    }),
    [locale, changeLocale, translate, isLoading],
  );

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

export function useTranslations() {
  const { t } = useLocale();
  return t;
}

export const availableLocales = LOCALE_OPTIONS;
