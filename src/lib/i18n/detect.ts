export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'es', 'fr'];

/**
 * Detect the preferred language for the current user.
 * - In the browser, uses `navigator.languages` / `navigator.language`.
 * - On the server, an optional Accept-Language header string can be passed.
 * Falls back to `DEFAULT_LOCALE` when nothing matches.
 */
export function detectLanguage(acceptLanguage?: string): string {
  // Browser context
  if (typeof navigator !== 'undefined') {
    const langs = (navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language]) as string[];
    for (const lang of langs) {
      const base = lang.toLowerCase().split('-')[0];
      if (SUPPORTED_LOCALES.includes(base)) return base;
    }
  }

  // Server context - parse Accept-Language
  if (acceptLanguage) {
    const parts = acceptLanguage.split(',');
    for (const part of parts) {
      const base = part.trim().toLowerCase().split(';')[0].split('-')[0];
      if (SUPPORTED_LOCALES.includes(base)) return base;
    }
  }

  return DEFAULT_LOCALE;
}
