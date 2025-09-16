import type { NextRouter } from 'next/router';

export const LOCALE_OPTIONS = [
  {
    code: 'en-US',
    label: 'English (United States)',
    nativeName: 'English',
    region: 'United States',
    currency: 'USD',
  },
  {
    code: 'en-GB',
    label: 'English (United Kingdom)',
    nativeName: 'English',
    region: 'United Kingdom',
    currency: 'GBP',
  },
  {
    code: 'fr-FR',
    label: 'Français (France)',
    nativeName: 'Français',
    region: 'France',
    currency: 'EUR',
  },
  {
    code: 'es-ES',
    label: 'Español (España)',
    nativeName: 'Español',
    region: 'Spain',
    currency: 'EUR',
  },
  {
    code: 'de-DE',
    label: 'Deutsch (Deutschland)',
    nativeName: 'Deutsch',
    region: 'Germany',
    currency: 'EUR',
  },
  {
    code: 'ja-JP',
    label: '日本語 (日本)',
    nativeName: '日本語',
    region: 'Japan',
    currency: 'JPY',
  },
] as const;

export type LocaleOption = (typeof LOCALE_OPTIONS)[number];
export type LocaleCode = LocaleOption['code'];

export const DEFAULT_LOCALE: LocaleCode = 'en-US';

export const LOCALE_CODES: readonly LocaleCode[] = LOCALE_OPTIONS.map(
  (locale) => locale.code,
);

export function isSupportedLocale(value: string | null | undefined): value is LocaleCode {
  if (!value) return false;
  return LOCALE_CODES.some((code) => code.toLowerCase() === value.toLowerCase());
}

export function resolveLocale(value: string | null | undefined): LocaleCode {
  if (value && isSupportedLocale(value)) {
    const match = LOCALE_OPTIONS.find(
      (option) => option.code.toLowerCase() === value.toLowerCase(),
    );
    if (match) return match.code;
  }

  const cleaned = value?.trim().toLowerCase();
  if (cleaned) {
    const exact = LOCALE_OPTIONS.find(
      (option) => option.code.toLowerCase() === cleaned,
    );
    if (exact) return exact.code;

    const language = cleaned.split('-')[0];
    const languageMatch = LOCALE_OPTIONS.find((option) =>
      option.code.toLowerCase().startsWith(language),
    );
    if (languageMatch) return languageMatch.code;
  }

  return DEFAULT_LOCALE;
}

export function applyLocaleToRouting(
  router: Pick<
    NextRouter,
    'isReady' | 'asPath' | 'locale' | 'defaultLocale' | 'locales' | 'replace'
  > | null,
  locale: LocaleCode,
): void {
  if (typeof window === 'undefined') return;

  persistLocaleCookie(locale);

  const currentLocale = router?.locale ?? router?.defaultLocale ?? getUrlLocale();
  if (currentLocale === locale) {
    ensureQueryLocale(locale);
    return;
  }

  const locales = router?.locales;
  const hasNextI18n = Array.isArray(locales) && locales.length > 0;
  if (router?.isReady && hasNextI18n) {
    const result = router.replace(router.asPath, router.asPath, {
      locale,
      scroll: false,
      shallow: true,
    });

    if (result instanceof Promise) {
      result.catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to update locale via Next router', error);
        }
        ensureQueryLocale(locale);
      });
    }
    return;
  }

  ensureQueryLocale(locale);
}

function ensureQueryLocale(locale: LocaleCode) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.get('lang') === locale) return;
  url.searchParams.set('lang', locale);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

function persistLocaleCookie(locale: LocaleCode) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${oneYear}`;
}

function getUrlLocale(): LocaleCode {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const urlLocale = window.location.search
    ? new URL(window.location.href).searchParams.get('lang')
    : null;
  return resolveLocale(urlLocale);
}
