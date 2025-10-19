export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const DEFAULT_NAMESPACE = 'common';
export const DEFAULT_NAMESPACES = [DEFAULT_NAMESPACE] as const;

// Update this list when adding a new locale. Keep the default locale first for clarity.
export const SUPPORTED_LOCALES = [DEFAULT_LOCALE] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type Namespace = (typeof DEFAULT_NAMESPACES)[number] | string;
