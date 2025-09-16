export type TextDirection = 'ltr' | 'rtl';

const RTL_LOCALES = new Set([
  'ar',
  'arc',
  'ckb',
  'dv',
  'fa',
  'he',
  'ku',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
]);

const normalizeLocale = (locale?: string | null): string | undefined => {
  if (!locale) return undefined;
  return locale.toLowerCase();
};

export const isRtlLocale = (locale?: string | null): boolean => {
  const normalized = normalizeLocale(locale);
  if (!normalized) return false;
  if (RTL_LOCALES.has(normalized)) return true;
  const base = normalized.split('-')[0];
  return RTL_LOCALES.has(base);
};

export const getDirectionFromLocale = (
  locale?: string | null,
  fallback: TextDirection = 'ltr',
): TextDirection => {
  if (locale) {
    return isRtlLocale(locale) ? 'rtl' : 'ltr';
  }

  if (typeof document !== 'undefined') {
    const explicitDir = document.documentElement.getAttribute('dir');
    if (explicitDir === 'rtl' || explicitDir === 'ltr') {
      return explicitDir;
    }
    const langAttr = document.documentElement.getAttribute('lang');
    if (langAttr && isRtlLocale(langAttr)) {
      return 'rtl';
    }
  }

  if (typeof navigator !== 'undefined') {
    const navLang = navigator.language || navigator.languages?.[0];
    if (navLang && isRtlLocale(navLang)) {
      return 'rtl';
    }
  }

  return fallback;
};

export { RTL_LOCALES };
