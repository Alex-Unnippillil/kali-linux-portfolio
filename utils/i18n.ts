export type LocaleCode = 'en' | 'es';

interface LocaleDefinition {
  code: LocaleCode;
  label: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export const LOCALE_DEFINITIONS: readonly LocaleDefinition[] = [
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    direction: 'ltr',
  },
  {
    code: 'es',
    label: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
  },
];

export const DEFAULT_LOCALE: LocaleCode = 'en';

export function normalizeLocale(locale: string | undefined | null): LocaleCode {
  if (!locale) return DEFAULT_LOCALE;
  const lower = locale.toLowerCase();
  const exact = LOCALE_DEFINITIONS.find((definition) => definition.code === lower);
  if (exact) return exact.code;
  const match = LOCALE_DEFINITIONS.find((definition) => lower.startsWith(definition.code));
  return match ? match.code : DEFAULT_LOCALE;
}

export function getLocaleDefinition(locale: string | undefined | null): LocaleDefinition {
  const code = normalizeLocale(locale);
  return LOCALE_DEFINITIONS.find((definition) => definition.code === code) ?? LOCALE_DEFINITIONS[0];
}

export function getDirection(locale: string | undefined | null): 'ltr' | 'rtl' {
  return getLocaleDefinition(locale).direction;
}
