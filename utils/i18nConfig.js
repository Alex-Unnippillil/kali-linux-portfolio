export const AVAILABLE_LOCALES = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
  },
  {
    code: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
  },
  {
    code: 'fr',
    label: 'French',
    nativeLabel: 'Français',
  },
];

export const FALLBACK_LOCALE = 'en';

const normalize = (locale) =>
  (locale || '')
    .toLowerCase()
    .replace('_', '-')
    .trim();

export function matchLocale(locale) {
  const normalized = normalize(locale);
  if (!normalized) return FALLBACK_LOCALE;
  const exact = AVAILABLE_LOCALES.find(
    (item) => normalize(item.code) === normalized,
  );
  if (exact) return exact.code;
  const prefix = normalized.split('-')[0];
  const prefixMatch = AVAILABLE_LOCALES.find((item) =>
    normalize(item.code).startsWith(prefix),
  );
  return prefixMatch ? prefixMatch.code : FALLBACK_LOCALE;
}

export function detectLocale() {
  if (typeof navigator === 'undefined') return FALLBACK_LOCALE;
  const preferences = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language];
  for (const preference of preferences) {
    if (!preference) continue;
    const matched = matchLocale(preference);
    if (matched) return matched;
  }
  return FALLBACK_LOCALE;
}

export function getLocaleLabel(locale) {
  const normalized = matchLocale(locale);
  const meta = AVAILABLE_LOCALES.find((item) => item.code === normalized);
  return meta?.nativeLabel || meta?.label || normalized;
}
