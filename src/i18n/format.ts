export type DateInput = Date | number | string;
export type NumericInput = number | bigint;

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function createCacheKey(locale: string, options?: Record<string, unknown>) {
  if (!options) {
    return locale;
  }

  const sortedEntries = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `${locale}:${JSON.stringify(sortedEntries)}`;
}

function hasDateTimeFormat(): boolean {
  return typeof globalThis.Intl !== 'undefined' && typeof globalThis.Intl.DateTimeFormat === 'function';
}

function hasNumberFormat(): boolean {
  return typeof globalThis.Intl !== 'undefined' && typeof globalThis.Intl.NumberFormat === 'function';
}

function hasPluralRules(): boolean {
  return typeof globalThis.Intl !== 'undefined' && typeof globalThis.Intl.PluralRules === 'function';
}

function normalizeDate(value: DateInput): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function fallbackDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toISOString();
}

function fallbackNumber(value: NumericInput): string {
  return value.toString();
}

function fallbackPlural(value: number, forms: PluralForms): string {
  const absolute = Math.abs(value);

  if (absolute === 0 && forms.zero) {
    return forms.zero;
  }

  if (absolute === 1 && forms.one) {
    return forms.one;
  }

  if (absolute === 2 && forms.two) {
    return forms.two;
  }

  if (absolute >= 2 && absolute <= 4 && forms.few) {
    return forms.few;
  }

  if (absolute >= 5 && forms.many) {
    return forms.many;
  }

  return forms.other;
}

function getDateTimeFormatter(locale: string, options?: Intl.DateTimeFormatOptions) {
  const cacheKey = createCacheKey(locale, options as Record<string, unknown> | undefined);
  const cachedFormatter = dateTimeFormatCache.get(cacheKey);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new globalThis.Intl.DateTimeFormat(locale, options);
  dateTimeFormatCache.set(cacheKey, formatter);
  return formatter;
}

function getNumberFormatter(locale: string, options?: Intl.NumberFormatOptions) {
  const cacheKey = createCacheKey(locale, options as Record<string, unknown> | undefined);
  const cachedFormatter = numberFormatCache.get(cacheKey);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new globalThis.Intl.NumberFormat(locale, options);
  numberFormatCache.set(cacheKey, formatter);
  return formatter;
}

function getPluralRules(locale: string, options?: Intl.PluralRulesOptions) {
  const cacheKey = createCacheKey(locale, options as Record<string, unknown> | undefined);
  const cachedRules = pluralRulesCache.get(cacheKey);

  if (cachedRules) {
    return cachedRules;
  }

  const rules = new globalThis.Intl.PluralRules(locale, options);
  pluralRulesCache.set(cacheKey, rules);
  return rules;
}

function resolveLocale(locale?: string) {
  if (locale) {
    return locale;
  }

  if (typeof navigator !== 'undefined') {
    if (Array.isArray((navigator as Navigator & { languages?: string[] }).languages)) {
      const [primary] = (navigator as Navigator & { languages?: string[] }).languages;
      if (primary) {
        return primary;
      }
    }

    if (navigator.language) {
      return navigator.language;
    }
  }

  return 'en-US';
}

export function formatDate(
  value: DateInput,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = normalizeDate(value);

  if (!date) {
    return 'Invalid Date';
  }

  const resolvedLocale = resolveLocale(locale);

  if (!hasDateTimeFormat()) {
    return fallbackDate(date);
  }

  try {
    return getDateTimeFormatter(resolvedLocale, options).format(date);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('formatDate fallback triggered', error);
    }
    return fallbackDate(date);
  }
}

export function formatNumber(
  value: NumericInput,
  locale?: string,
  options?: Intl.NumberFormatOptions,
): string {
  const resolvedLocale = resolveLocale(locale);

  if (!hasNumberFormat()) {
    return fallbackNumber(value);
  }

  try {
    return getNumberFormatter(resolvedLocale, options).format(value);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('formatNumber fallback triggered', error);
    }
    return fallbackNumber(value);
  }
}

export function formatPlural(
  value: number,
  locale?: string,
  forms: PluralForms,
  options?: Intl.PluralRulesOptions,
): string {
  const resolvedLocale = resolveLocale(locale);

  if (!hasPluralRules()) {
    return fallbackPlural(value, forms);
  }

  try {
    const rule = getPluralRules(resolvedLocale, options).select(value);
    return forms[rule] ?? forms.other;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('formatPlural fallback triggered', error);
    }
    return fallbackPlural(value, forms);
  }
}

export interface LocaleFormatterDefaults {
  date?: Intl.DateTimeFormatOptions;
  number?: Intl.NumberFormatOptions;
  plural?: Intl.PluralRulesOptions;
}

function mergeOptions<T extends Record<string, unknown> | undefined>(
  defaults?: T,
  overrides?: T,
): T | undefined {
  if (defaults && overrides) {
    return { ...defaults, ...overrides } as T;
  }

  return overrides ?? defaults;
}

export function createLocaleFormatters(locale: string, defaults: LocaleFormatterDefaults = {}) {
  return {
    date(value: DateInput, options?: Intl.DateTimeFormatOptions) {
      return formatDate(value, locale, mergeOptions(defaults.date, options));
    },
    number(value: NumericInput, options?: Intl.NumberFormatOptions) {
      return formatNumber(value, locale, mergeOptions(defaults.number, options));
    },
    plural(value: number, forms: PluralForms, options?: Intl.PluralRulesOptions) {
      return formatPlural(value, locale, forms, mergeOptions(defaults.plural, options));
    },
  };
}
