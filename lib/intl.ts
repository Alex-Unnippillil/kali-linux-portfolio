const DEFAULT_LOCALE = 'en-US';

type LocaleInput = string | readonly string[] | null | undefined;

type DateInput = Date | number | string;

const isNavigatorLocale = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeLocaleFromNavigator = (): string | undefined => {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  const languages = navigator.languages?.filter(Boolean);

  if (languages && languages.length > 0) {
    const candidate = languages.find((language) => isNavigatorLocale(language));
    if (candidate) {
      return candidate;
    }
  }

  if (isNavigatorLocale(navigator.language)) {
    return navigator.language;
  }

  const legacyLanguage = (navigator as Navigator & { userLanguage?: string }).userLanguage;

  if (isNavigatorLocale(legacyLanguage)) {
    return legacyLanguage;
  }

  return undefined;
};

export const resolveLocale = (locale?: LocaleInput): string => {
  if (Array.isArray(locale)) {
    const candidate = locale.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
    if (candidate) {
      return candidate;
    }
  } else if (typeof locale === 'string' && locale.trim().length > 0) {
    return locale;
  }

  const navigatorLocale = normalizeLocaleFromNavigator();
  if (navigatorLocale) {
    return navigatorLocale;
  }

  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
    if (resolved && resolved.length > 0) {
      return resolved;
    }
  }

  return DEFAULT_LOCALE;
};

const toDate = (value: DateInput): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  return new Date(value);
};

const isValidDate = (value: Date): boolean => !Number.isNaN(value.getTime());

const isValidNumber = (value: number): boolean => Number.isFinite(value);

export const createDateFormatter = (
  options?: Intl.DateTimeFormatOptions,
  locale?: LocaleInput,
): Intl.DateTimeFormat => new Intl.DateTimeFormat(resolveLocale(locale), options);

export const formatDate = (value: DateInput, options?: Intl.DateTimeFormatOptions, locale?: LocaleInput): string => {
  const date = toDate(value);
  if (!isValidDate(date)) {
    return 'Invalid Date';
  }

  return createDateFormatter(options, locale).format(date);
};

export const formatDateRange = (
  start: DateInput,
  end: DateInput,
  options?: Intl.DateTimeFormatOptions,
  locale?: LocaleInput,
): string => {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return 'Invalid Date';
  }

  const formatter = createDateFormatter(options, locale);
  return formatter.formatRange ? formatter.formatRange(startDate, endDate) : `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
};

export const createNumberFormatter = (
  options?: Intl.NumberFormatOptions,
  locale?: LocaleInput,
): Intl.NumberFormat => new Intl.NumberFormat(resolveLocale(locale), options);

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions, locale?: LocaleInput): string => {
  if (!isValidNumber(value)) {
    return String(value);
  }

  return createNumberFormatter(options, locale).format(value);
};

export const formatCurrency = (
  value: number,
  currency: string,
  options?: Intl.NumberFormatOptions,
  locale?: LocaleInput,
): string => formatNumber(value, { style: 'currency', currency, ...options }, locale);

export const formatPercent = (
  value: number,
  options?: Intl.NumberFormatOptions,
  locale?: LocaleInput,
): string => formatNumber(value, { style: 'percent', ...options }, locale);

export const createRelativeTimeFormatter = (
  options?: Intl.RelativeTimeFormatOptions,
  locale?: LocaleInput,
): Intl.RelativeTimeFormat => new Intl.RelativeTimeFormat(resolveLocale(locale), options);

export const formatRelativeTime = (
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
  locale?: LocaleInput,
): string => {
  if (!isValidNumber(value)) {
    return String(value);
  }

  return createRelativeTimeFormatter(options, locale).format(value, unit);
};

export { DEFAULT_LOCALE };
export type { LocaleInput, DateInput };
