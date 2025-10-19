import type { ReactNode } from 'react';
import enCommon from '../locales/en/common.json';
import frCommon from '../locales/fr/common.json';

const DEFAULT_LOCALE = 'en';
const ROOT_NAMESPACE = '__root__';

type TranslationLeaf = string | number | boolean | null;
type TranslationValue = TranslationLeaf | TranslationLeaf[] | TranslationRecord;
export interface TranslationRecord {
  [key: string]: TranslationValue;
}

type NamespaceMap = Record<string, TranslationRecord>;

type TranslationTable = Record<string, NamespaceMap>;

const translations: TranslationTable = {
  en: { common: enCommon as TranslationRecord },
  fr: { common: frCommon as TranslationRecord },
};

const SUPPORTED_LOCALES = new Set(Object.keys(translations));

let activeLocale = DEFAULT_LOCALE;
const missingWarnings = new Set<string>();
const unsupportedWarnings = new Set<string>();

const isProduction = () => process.env.NODE_ENV === 'production';

const warnOnce = (cache: Set<string>, key: string, message: string) => {
  if (isProduction()) return;
  if (cache.has(key)) return;
  cache.add(key);
  console.warn(message);
};

const normalize = (locale: string | null | undefined): string | null => {
  if (!locale) return null;
  const trimmed = locale.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().replace(/_/g, '-');
};

const findSupportedLocale = (raw: string | null | undefined): string | null => {
  const normalized = normalize(raw);
  if (!normalized) return null;
  if (SUPPORTED_LOCALES.has(normalized)) return normalized;
  const base = normalized.split('-')[0];
  if (SUPPORTED_LOCALES.has(base)) return base;
  return null;
};

const resolveLocale = (locale: string | null | undefined): string => {
  const supported = findSupportedLocale(locale);
  if (supported) return supported;
  if (locale) {
    const normalized = normalize(locale) ?? locale;
    warnOnce(
      unsupportedWarnings,
      normalized,
      `Unsupported locale "${locale}". Falling back to "${DEFAULT_LOCALE}".`,
    );
  }
  return DEFAULT_LOCALE;
};

const getNamespace = (locale: string, namespace: string): TranslationRecord | undefined => {
  const bundle = translations[locale];
  if (!bundle) return undefined;
  if (namespace === ROOT_NAMESPACE) return bundle[ROOT_NAMESPACE];
  return bundle[namespace] ?? bundle[ROOT_NAMESPACE];
};

const getValue = (locale: string, segments: string[]): string | undefined => {
  if (segments.length === 0) return undefined;
  const [namespace, ...rest] = segments;
  const dictionary = getNamespace(locale, namespace);
  if (!dictionary) return undefined;

  let current: TranslationValue | undefined = dictionary;
  for (const part of rest) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as TranslationRecord)[part];
  }

  if (current === undefined || current === null) return undefined;
  if (typeof current === 'string') return current;
  if (typeof current === 'number' || typeof current === 'boolean') return String(current);
  return undefined;
};

export interface TranslateOptions {
  locale?: string | null;
  fallback?: string;
}

export const translate = (key: string, options: TranslateOptions = {}): string => {
  if (!key) return '';
  const segments = key.split('.').filter(Boolean);
  if (segments.length === 0) return '';

  const locale = resolveLocale(options.locale ?? activeLocale);
  const direct = getValue(locale, segments);
  if (direct !== undefined) {
    return direct;
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallbackValue = getValue(DEFAULT_LOCALE, segments);
    if (fallbackValue !== undefined) {
      warnOnce(
        missingWarnings,
        `${locale}:${key}`,
        `Missing translation for "${key}" in locale "${locale}". Falling back to "${DEFAULT_LOCALE}".`,
      );
      return fallbackValue;
    }
  }

  if (options.fallback !== undefined) {
    warnOnce(
      missingWarnings,
      `fallback:${key}`,
      `Missing translation for "${key}". Using provided fallback value.`,
    );
    return options.fallback;
  }

  warnOnce(
    missingWarnings,
    `missing:${key}`,
    `Missing translation for "${key}" in all locales. Returning key as fallback.`,
  );
  return key;
};

export const t = translate;

export const getLocale = (): string => activeLocale;

export const setLocale = (nextLocale: string | null | undefined): string => {
  const resolved = resolveLocale(nextLocale);
  activeLocale = resolved;
  return activeLocale;
};

export const isSupportedLocale = (candidate: string | null | undefined): boolean => {
  const supported = findSupportedLocale(candidate);
  return Boolean(supported);
};

export const getAvailableLocales = (): string[] => Array.from(SUPPORTED_LOCALES).sort();

export const withLocale = <T>(locale: string, fn: () => T): T => {
  const previous = activeLocale;
  activeLocale = resolveLocale(locale);
  try {
    return fn();
  } finally {
    activeLocale = previous;
  }
};

export const formatReactMessage = (
  key: string,
  options: TranslateOptions = {},
): ReactNode => translate(key, options);

export const __unsafe_resetI18nStateForTests = () => {
  activeLocale = DEFAULT_LOCALE;
  missingWarnings.clear();
  unsupportedWarnings.clear();
};

export { DEFAULT_LOCALE };
