import IntlMessageFormat from 'intl-messageformat';
import en from './locales/en.json';
import es from './locales/es.json';

export type MessageValues = Record<string, unknown>;
export type MessageCatalog = Record<string, string>;
export type CatalogMap = Record<string, MessageCatalog>;

export const defaultCatalogs: CatalogMap = {
  en,
  es,
};

export type SupportedLocale = keyof typeof defaultCatalogs;

export const FALLBACK_LOCALE: SupportedLocale = 'en';

export interface MessageFormatter {
  format: (key: string, values?: MessageValues) => string;
  has: (key: string) => boolean;
  readonly resolvedLocale: string;
  readonly resolvedFallbackLocale: string;
}

export interface CreateMessageFormatterOptions {
  locale: string;
  fallbackLocale?: string;
  catalogs?: CatalogMap;
}

const formatterCache = new Map<string, IntlMessageFormat>();

function normalizeLocale(
  locale: string | undefined,
  catalogs: CatalogMap,
  fallbackLocale: string,
): string {
  if (!locale) return fallbackLocale;
  const lower = locale.toLowerCase();
  if (lower in catalogs) return lower;
  const [base] = lower.split(/[\-_]/);
  if (base && base in catalogs) return base;
  return fallbackLocale;
}

function getMessage(
  catalogs: CatalogMap,
  locale: string,
  key: string,
): string | undefined {
  return catalogs[locale]?.[key];
}

function getIntlFormatter(locale: string, key: string, message: string) {
  const cacheKey = `${locale}|${key}|${message}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new IntlMessageFormat(message, locale);
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

export function createMessageFormatter({
  locale,
  fallbackLocale = FALLBACK_LOCALE,
  catalogs = defaultCatalogs,
}: CreateMessageFormatterOptions): MessageFormatter {
  const normalizedFallback = normalizeLocale(
    fallbackLocale,
    catalogs,
    FALLBACK_LOCALE,
  );
  const normalizedLocale = normalizeLocale(
    locale,
    catalogs,
    normalizedFallback,
  );

  return {
    get resolvedLocale() {
      return normalizedLocale;
    },
    get resolvedFallbackLocale() {
      return normalizedFallback;
    },
    format(key: string, values?: MessageValues) {
      const directMessage = getMessage(catalogs, normalizedLocale, key);
      if (directMessage) {
        return String(
          getIntlFormatter(normalizedLocale, key, directMessage).format(values),
        );
      }
      if (normalizedFallback !== normalizedLocale) {
        const fallbackMessage = getMessage(
          catalogs,
          normalizedFallback,
          key,
        );
        if (fallbackMessage) {
          return String(
            getIntlFormatter(
              normalizedFallback,
              key,
              fallbackMessage,
            ).format(values),
          );
        }
      }
      return key;
    },
    has(key: string) {
      return (
        getMessage(catalogs, normalizedLocale, key) !== undefined ||
        getMessage(catalogs, normalizedFallback, key) !== undefined
      );
    },
  };
}

const runtimeCache = new Map<string, MessageFormatter>();

export function getMessageFormatter(
  locale?: string,
  fallbackLocale: string = FALLBACK_LOCALE,
): MessageFormatter {
  const normalizedFallback = normalizeLocale(
    fallbackLocale,
    defaultCatalogs,
    FALLBACK_LOCALE,
  );
  const normalizedLocale = normalizeLocale(
    locale,
    defaultCatalogs,
    normalizedFallback,
  );
  const cacheKey = `${normalizedLocale}|${normalizedFallback}`;
  let formatter = runtimeCache.get(cacheKey);
  if (!formatter) {
    formatter = createMessageFormatter({
      locale: normalizedLocale,
      fallbackLocale: normalizedFallback,
      catalogs: defaultCatalogs,
    });
    runtimeCache.set(cacheKey, formatter);
  }
  return formatter;
}

export function formatMessage(
  key: string,
  values?: MessageValues,
  options?: { locale?: string; fallbackLocale?: string },
): string {
  const formatter = getMessageFormatter(
    options?.locale,
    options?.fallbackLocale ?? FALLBACK_LOCALE,
  );
  return formatter.format(key, values);
}

export function detectLocale(defaultLocale: string = FALLBACK_LOCALE): string {
  if (typeof navigator !== 'undefined') {
    const nav = navigator as Navigator & { languages?: string[] };
    if (nav.languages?.length) {
      return nav.languages[0];
    }
    if (nav.language) {
      return nav.language;
    }
  }
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    const resolved = new Intl.DateTimeFormat().resolvedOptions().locale;
    if (resolved) {
      return resolved;
    }
  }
  return defaultLocale;
}
