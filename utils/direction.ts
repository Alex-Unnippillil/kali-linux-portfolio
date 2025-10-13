const RTL_LOCALE_CODES = new Set([
  'ar',
  'arc',
  'ckb',
  'fa',
  'he',
  'ku',
  'prs',
  'ps',
  'ur',
]);

export function normalizeLocale(locale?: string, fallback = 'en'): string {
  if (!locale) return fallback;
  const trimmed = locale.trim();
  if (!trimmed) return fallback;
  const normalized = trimmed.replace('_', '-');
  const segments = normalized.split('-').filter(Boolean);
  if (segments.length === 0) {
    return fallback;
  }
  const [language, ...rest] = segments;
  const lang = language.toLowerCase();
  const regionSegments = rest.map((segment, index) =>
    index === 0 ? segment.toUpperCase() : segment,
  );
  return [lang, ...regionSegments].join('-');
}

export function isLocaleRtl(locale?: string): boolean {
  if (!locale) return false;
  const normalized = normalizeLocale(locale);
  const [language] = normalized.split('-');
  return RTL_LOCALE_CODES.has(language);
}

export function getDirection(locale?: string): 'ltr' | 'rtl' {
  return isLocaleRtl(locale) ? 'rtl' : 'ltr';
}

export function parsePreferredLocale(header?: string): string | undefined {
  if (!header) return undefined;
  const parts = header
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const [tag] = part.split(';');
    if (tag) {
      return normalizeLocale(tag);
    }
  }
  return undefined;
}

export function resolveLocale({
  locale,
  defaultLocale,
  acceptLanguage,
  navigatorLocale,
}: {
  locale?: string | null;
  defaultLocale?: string | null;
  acceptLanguage?: string | null;
  navigatorLocale?: string | null;
}): string {
  const preferred =
    locale ??
    navigatorLocale ??
    parsePreferredLocale(acceptLanguage ?? undefined) ??
    defaultLocale ??
    undefined;

  return normalizeLocale(preferred ?? undefined);
}
