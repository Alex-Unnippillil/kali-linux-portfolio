import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';

export type DateInput = Date | number | string;

export interface LocalePreferences {
  locale: string;
  numberingSystem?: string;
  calendar?: string;
  timeZone?: string;
}

interface LocaleProviderProps {
  children: ReactNode;
  value?: Partial<LocalePreferences>;
}

const envLocale = process.env.NEXT_PUBLIC_LOCALE ?? undefined;
const envNumberingSystem = process.env.NEXT_PUBLIC_NUMBERING_SYSTEM ?? undefined;
const envCalendar = process.env.NEXT_PUBLIC_CALENDAR ?? undefined;
const envTimeZone = process.env.NEXT_PUBLIC_TIME_ZONE ?? undefined;

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_NUMBERING_SYSTEM = 'latn';
const DEFAULT_CALENDAR = 'gregory';

const DEFAULT_PREFERENCES: LocalePreferences = {
  locale: envLocale || DEFAULT_LOCALE,
  numberingSystem: envNumberingSystem || DEFAULT_NUMBERING_SYSTEM,
  calendar: envCalendar || DEFAULT_CALENDAR,
  timeZone: envTimeZone,
};

export const LocaleContext = createContext<LocalePreferences>(DEFAULT_PREFERENCES);

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();
const relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>();

function normalizeLocalePreferences(
  preferences?: Partial<LocalePreferences>,
): LocalePreferences {
  if (!preferences) return { ...DEFAULT_PREFERENCES };
  return {
    locale: preferences.locale || DEFAULT_PREFERENCES.locale,
    numberingSystem:
      preferences.numberingSystem !== undefined
        ? preferences.numberingSystem
        : DEFAULT_PREFERENCES.numberingSystem,
    calendar:
      preferences.calendar !== undefined
        ? preferences.calendar
        : DEFAULT_PREFERENCES.calendar,
    timeZone:
      preferences.timeZone !== undefined
        ? preferences.timeZone
        : DEFAULT_PREFERENCES.timeZone,
  };
}

function buildUnicodeLocale(baseLocale: string, extensions: string[]): string {
  if (extensions.length === 0) {
    return baseLocale.replace(/-u-.*/, '');
  }

  const cleanedBase = baseLocale.replace(/-u-.*/, '');
  return `${cleanedBase}-u-${extensions.join('-')}`;
}

function getDateFromInput(input: DateInput): Date | null {
  if (input instanceof Date) {
    const time = input.getTime();
    return Number.isNaN(time) ? null : input;
  }

  if (typeof input === 'number') {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof input === 'string') {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function getNumberFormatter(
  preferences: LocalePreferences,
  options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat {
  const { locale, numberingSystem } = preferences;
  const extensions: string[] = [];
  if (numberingSystem) {
    extensions.push(`nu-${numberingSystem}`);
  }
  const localeId = buildUnicodeLocale(locale, extensions);
  const cacheKey = `${localeId}|${JSON.stringify(options)}`;
  let formatter = numberFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(localeId, options);
    numberFormatCache.set(cacheKey, formatter);
  }
  return formatter;
}

function getDateTimeFormatter(
  preferences: LocalePreferences,
  options: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormat {
  const { locale, numberingSystem, calendar, timeZone } = preferences;
  const extensions: string[] = [];
  if (numberingSystem) extensions.push(`nu-${numberingSystem}`);
  if (calendar) extensions.push(`ca-${calendar}`);
  const localeId = buildUnicodeLocale(locale, extensions);
  const finalOptions: Intl.DateTimeFormatOptions = {
    ...options,
  };
  if (!finalOptions.timeZone && timeZone) {
    finalOptions.timeZone = timeZone;
  }
  const cacheKey = `${localeId}|${JSON.stringify(finalOptions)}`;
  let formatter = dateTimeFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(localeId, finalOptions);
    dateTimeFormatCache.set(cacheKey, formatter);
  }
  return formatter;
}

function getRelativeTimeFormatter(
  preferences: LocalePreferences,
  options: Intl.RelativeTimeFormatOptions = {},
): Intl.RelativeTimeFormat {
  const { locale, numberingSystem } = preferences;
  const extensions: string[] = [];
  if (numberingSystem) extensions.push(`nu-${numberingSystem}`);
  const localeId = buildUnicodeLocale(locale, extensions);
  const cacheKey = `${localeId}|${JSON.stringify(options)}`;
  let formatter = relativeTimeFormatCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(localeId, options);
    relativeTimeFormatCache.set(cacheKey, formatter);
  }
  return formatter;
}

export function formatNumber(
  value: number | bigint,
  options?: Intl.NumberFormatOptions,
  overrides?: Partial<LocalePreferences>,
): string {
  const preferences = normalizeLocalePreferences(overrides);
  return getNumberFormatter(preferences, options).format(value);
}

export function formatDateTime(
  value: DateInput,
  options?: Intl.DateTimeFormatOptions,
  overrides?: Partial<LocalePreferences>,
): string {
  const date = getDateFromInput(value);
  if (!date) return '';
  const preferences = normalizeLocalePreferences(overrides);
  return getDateTimeFormatter(preferences, options).format(date);
}

export function formatDate(
  value: DateInput,
  options?: Intl.DateTimeFormatOptions,
  overrides?: Partial<LocalePreferences>,
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return formatDateTime(value, { ...defaultOptions, ...options }, overrides);
}

export function formatRelativeTime(
  value: DateInput,
  base: DateInput = Date.now(),
  unit: Intl.RelativeTimeFormatUnit = 'day',
  options?: Intl.RelativeTimeFormatOptions,
  overrides?: Partial<LocalePreferences>,
): string {
  const targetDate = getDateFromInput(value);
  const baseDate = getDateFromInput(base);
  if (!targetDate || !baseDate) return '';
  const diffMs = targetDate.getTime() - baseDate.getTime();

  const divisors: Record<Intl.RelativeTimeFormatUnit, number> = {
    year: 1000 * 60 * 60 * 24 * 365,
    quarter: 1000 * 60 * 60 * 24 * 91,
    month: 1000 * 60 * 60 * 24 * 30,
    week: 1000 * 60 * 60 * 24 * 7,
    day: 1000 * 60 * 60 * 24,
    hour: 1000 * 60 * 60,
    minute: 1000 * 60,
    second: 1000,
  };

  const valueInUnit = diffMs / divisors[unit];
  const preferences = normalizeLocalePreferences(overrides);
  return getRelativeTimeFormatter(preferences, options).format(valueInUnit, unit);
}

export function LocaleProvider({ children, value }: LocaleProviderProps) {
  const normalizedValue = normalizeLocalePreferences(value);
  const [locale, setLocale] = useState(normalizedValue.locale);

  useEffect(() => {
    if (value?.locale) {
      setLocale(value.locale);
      return;
    }
    if (typeof window !== 'undefined' && window.navigator?.language) {
      setLocale(window.navigator.language);
    }
  }, [value?.locale]);

  const contextValue = useMemo<LocalePreferences>(() => {
    const merged = normalizeLocalePreferences({
      ...normalizedValue,
      locale,
    });
    return merged;
  }, [locale, normalizedValue.calendar, normalizedValue.locale, normalizedValue.numberingSystem, normalizedValue.timeZone]);

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>;
}

export function useLocalePreferences(): LocalePreferences {
  return useContext(LocaleContext);
}

export function createFormatter(preferences: LocalePreferences) {
  const normalized = normalizeLocalePreferences(preferences);
  return {
    formatNumber: (value: number | bigint, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, options, normalized),
    formatDateTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(value, options, normalized),
    formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) =>
      formatDate(value, options, normalized),
    formatRelativeTime: (
      value: DateInput,
      base?: DateInput,
      unit?: Intl.RelativeTimeFormatUnit,
      options?: Intl.RelativeTimeFormatOptions,
    ) => formatRelativeTime(value, base, unit, options, normalized),
  };
}

export function useFormatter(overrides?: Partial<LocalePreferences>) {
  const preferences = useLocalePreferences();
  return useMemo(() => {
    const merged = overrides ? { ...preferences, ...overrides } : preferences;
    return createFormatter(merged);
  }, [preferences, overrides?.calendar, overrides?.locale, overrides?.numberingSystem, overrides?.timeZone]);
}

export const defaultLocalePreferences = DEFAULT_PREFERENCES;
