import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  MessageCatalog,
  MessageDictionary,
  MessageValues,
  createTranslator,
} from '../lib/i18n';
import { safeLocalStorage } from '../utils/safeStorage';

const STORAGE_KEYS = {
  locale: 'i18n.locale',
  direction: 'i18n.direction',
  pseudo: 'i18n.pseudo',
} as const;

export type TextDirection = 'ltr' | 'rtl';

export interface LocalizationContextValue {
  locale: string;
  direction: TextDirection;
  pseudoLocaleEnabled: boolean;
  translate: (key: string, defaultMessage?: string, values?: MessageValues) => string;
  setLocale: (locale: string) => void;
  setDirection: (direction: TextDirection) => void;
  setPseudoLocaleEnabled: (enabled: boolean) => void;
  registerMessages: (locale: string, messages: MessageDictionary) => void;
  catalogs: MessageCatalog;
}

const defaultCatalog: MessageCatalog = {};

export const LocalizationContext = createContext<LocalizationContextValue>({
  locale: 'en',
  direction: 'ltr',
  pseudoLocaleEnabled: false,
  translate: (key, fallback) => fallback ?? key,
  setLocale: () => {},
  setDirection: () => {},
  setPseudoLocaleEnabled: () => {},
  registerMessages: () => {},
  catalogs: defaultCatalog,
});

interface ProviderProps {
  children: ReactNode;
  catalogs?: MessageCatalog;
  defaultLocale?: string;
}

const isTextDirection = (value: string | null | undefined): value is TextDirection =>
  value === 'rtl' || value === 'ltr';

export const LocalizationProvider = ({
  children,
  catalogs: initialCatalogs,
  defaultLocale = 'en',
}: ProviderProps) => {
  const [catalogs, setCatalogs] = useState<MessageCatalog>(initialCatalogs ?? defaultCatalog);
  const [locale, setLocaleState] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultLocale;
    const stored = safeLocalStorage?.getItem(STORAGE_KEYS.locale);
    return stored || defaultLocale;
  });
  const [direction, setDirectionState] = useState<TextDirection>(() => {
    if (typeof window === 'undefined') return 'ltr';
    const stored = safeLocalStorage?.getItem(STORAGE_KEYS.direction);
    return isTextDirection(stored) ? stored : 'ltr';
  });
  const [pseudoLocaleEnabled, setPseudoLocaleEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return safeLocalStorage?.getItem(STORAGE_KEYS.pseudo) === 'true';
  });

  const initialisedRef = useRef(false);

  useEffect(() => {
    if (!initialCatalogs) return;
    setCatalogs((previous) => ({ ...previous, ...initialCatalogs }));
  }, [initialCatalogs]);

  useEffect(() => {
    if (!initialisedRef.current) {
      initialisedRef.current = true;
      return;
    }
    safeLocalStorage?.setItem(STORAGE_KEYS.locale, locale);
  }, [locale]);

  useEffect(() => {
    if (!initialisedRef.current) return;
    safeLocalStorage?.setItem(STORAGE_KEYS.direction, direction);
  }, [direction]);

  useEffect(() => {
    if (!initialisedRef.current) return;
    safeLocalStorage?.setItem(STORAGE_KEYS.pseudo, pseudoLocaleEnabled ? 'true' : 'false');
  }, [pseudoLocaleEnabled]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', direction);
    document.body?.setAttribute('dir', direction);
  }, [direction]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', locale);
  }, [locale]);

  const translator = useMemo(
    () =>
      createTranslator({
        locale,
        catalogs,
        usePseudo: pseudoLocaleEnabled,
      }),
    [catalogs, locale, pseudoLocaleEnabled],
  );

  const translate = useCallback(
    (key: string, defaultMessage?: string, values?: MessageValues) =>
      translator.t(key, defaultMessage, values),
    [translator],
  );

  const setLocale = useCallback((nextLocale: string) => {
    setLocaleState(nextLocale);
  }, []);

  const setDirection = useCallback((nextDirection: TextDirection) => {
    setDirectionState(isTextDirection(nextDirection) ? nextDirection : 'ltr');
  }, []);

  const setPseudoLocaleEnabled = useCallback((enabled: boolean) => {
    setPseudoLocaleEnabledState(Boolean(enabled));
  }, []);

  const registerMessages = useCallback((nextLocale: string, messages: MessageDictionary) => {
    setCatalogs((prev) => ({
      ...prev,
      [nextLocale]: { ...(prev[nextLocale] ?? {}), ...messages },
    }));
  }, []);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      direction,
      pseudoLocaleEnabled,
      translate,
      setLocale,
      setDirection,
      setPseudoLocaleEnabled,
      registerMessages,
      catalogs,
    }),
    [catalogs, direction, locale, pseudoLocaleEnabled, registerMessages, setDirection, setLocale, setPseudoLocaleEnabled, translate],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
};

export const useLocalization = () => useContext(LocalizationContext);

export const useTranslate = () => {
  const { translate } = useLocalization();
  return translate;
};
