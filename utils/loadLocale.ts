import baseMessages from '../locales/en.json';

export type MessageValue = string | MessageDictionary;
export type MessageDictionary = Record<string, MessageValue>;
export type LocaleMessages = typeof baseMessages;

const localeDefinitions = {
  en: {
    loader: async () => baseMessages,
  },
  es: {
    loader: () => import('../locales/es.json').then((mod) => mod.default),
  },
  fr: {
    loader: () => import('../locales/fr.json').then((mod) => mod.default),
  },
} as const;

export type SupportedLocale = keyof typeof localeDefinitions;

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const SUPPORTED_LOCALES = Object.keys(localeDefinitions) as SupportedLocale[];

const messageCache = new Map<SupportedLocale, LocaleMessages>();
const warnedMissing = new Set<SupportedLocale>();

export const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  SUPPORTED_LOCALES.includes(locale as SupportedLocale);

const isDictionary = (value: MessageValue | undefined): value is MessageDictionary =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = (base: MessageDictionary, override?: MessageDictionary): MessageDictionary => {
  const result: MessageDictionary = {};

  for (const key of Object.keys(base)) {
    const baseValue = base[key];
    const overrideValue = override?.[key];

    if (isDictionary(baseValue)) {
      const nestedOverride = isDictionary(overrideValue) ? overrideValue : undefined;
      result[key] = deepMerge(baseValue, nestedOverride);
    } else if (typeof overrideValue === 'string') {
      result[key] = overrideValue;
    } else {
      result[key] = baseValue;
    }
  }

  if (override) {
    for (const key of Object.keys(override)) {
      if (!(key in result)) {
        result[key] = override[key];
      }
    }
  }

  return result;
};

const collectMissingKeys = (
  base: MessageDictionary,
  candidate?: MessageDictionary,
  path: string[] = [],
): string[] => {
  const missing: string[] = [];

  for (const key of Object.keys(base)) {
    const baseValue = base[key];
    const candidateValue = candidate?.[key];
    const nextPath = [...path, key];

    if (isDictionary(baseValue)) {
      if (isDictionary(candidateValue)) {
        missing.push(...collectMissingKeys(baseValue, candidateValue, nextPath));
      } else {
        missing.push(...collectMissingKeys(baseValue, undefined, nextPath));
      }
    } else if (typeof candidateValue !== 'string') {
      missing.push(nextPath.join('.'));
    }
  }

  return missing;
};

const warnMissingKeys = (
  locale: SupportedLocale,
  base: MessageDictionary,
  candidate: MessageDictionary,
) => {
  if (process.env.NODE_ENV === 'production' || warnedMissing.has(locale)) {
    return;
  }

  const missing = collectMissingKeys(base, candidate);
  if (missing.length > 0) {
    console.warn(
      `[i18n] Missing translation keys for locale "${locale}": ${missing.join(', ')}`,
    );
    warnedMissing.add(locale);
  }
};

export const loadLocale = async (locale: string): Promise<LocaleMessages> => {
  const normalized: SupportedLocale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;

  if (normalized === DEFAULT_LOCALE) {
    return baseMessages;
  }

  if (messageCache.has(normalized)) {
    return messageCache.get(normalized)!;
  }

  const loader = localeDefinitions[normalized]?.loader;
  if (!loader) {
    return baseMessages;
  }

  try {
    const rawMessages = await loader();
    const merged = deepMerge(baseMessages as MessageDictionary, rawMessages as MessageDictionary);
    warnMissingKeys(normalized, baseMessages as MessageDictionary, rawMessages as MessageDictionary);
    messageCache.set(normalized, merged as LocaleMessages);
    return merged as LocaleMessages;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[i18n] Failed to load locale "${normalized}". Falling back to ${DEFAULT_LOCALE}.`,
        error,
      );
    }
    return baseMessages;
  }
};

export const getLocaleLabels = (messages: LocaleMessages): Record<SupportedLocale, string> => {
  const labels = messages.localeNames as Record<string, string>;
  const result = {} as Record<SupportedLocale, string>;

  for (const locale of SUPPORTED_LOCALES) {
    result[locale] = labels[locale] ?? locale;
  }

  return result;
};

export const getMessage = (messages: MessageDictionary, key: string): string | undefined => {
  const segments = key.split('.');
  let current: MessageValue | undefined = messages;

  for (const segment of segments) {
    if (isDictionary(current)) {
      current = current[segment];
    } else {
      current = undefined;
      break;
    }
  }

  return typeof current === 'string' ? current : undefined;
};
