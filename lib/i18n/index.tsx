import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import en from '../../locales/en.json';
import es from '../../locales/es.json';

type Dictionary = Record<string, unknown>;

type TranslationValues = Record<string, string | number | boolean>;

export type Translator = (key: string, values?: TranslationValues) => string;

interface I18nContextValue {
  locale: string;
  t: Translator;
  setLocale: (locale: string) => void;
}

const DEFAULT_LOCALE = 'en';

const dictionaries: Record<string, Dictionary> = {
  en: en as Dictionary,
  es: es as Dictionary,
};

const noopTranslator: Translator = (key) => key;

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: noopTranslator,
  setLocale: () => undefined,
});

const resolvePath = (dict: Dictionary, key: string): unknown => {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, dict);
};

const formatTemplate = (template: string, values: TranslationValues = {}): string => {
  return template.replace(/\{\{(.*?)\}\}/g, (match, rawKey) => {
    const trimmed = rawKey.trim();
    if (!(trimmed in values)) return match;
    const value = values[trimmed];
    return value === undefined || value === null ? '' : String(value);
  });
};

const createTranslator = (locale: string): Translator => {
  const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  return (key, values) => {
    const localized = resolvePath(dictionary, key);
    if (typeof localized === 'string') {
      return formatTemplate(localized, values ?? {});
    }
    if (locale !== DEFAULT_LOCALE) {
      const fallback = resolvePath(dictionaries[DEFAULT_LOCALE], key);
      if (typeof fallback === 'string') {
        return formatTemplate(fallback, values ?? {});
      }
    }
    return key;
  };
};

interface I18nProviderProps {
  locale?: string;
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  locale: initialLocale = DEFAULT_LOCALE,
  children,
}) => {
  const [locale, setLocale] = useState(initialLocale);

  const translator = useMemo(() => createTranslator(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: translator,
      setLocale,
    }),
    [locale, translator],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);

export const getTranslator = (locale: string = DEFAULT_LOCALE) =>
  createTranslator(locale);

