import type { IncomingMessage } from 'http';
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, type SupportedLocale } from './constants';
import {
  normalizeLocale,
  parseCookies,
  resolveLocalePath,
  isSupportedLocale,
  getHeader,
} from './utils';

export interface DetectLocaleInput {
  req?: IncomingMessage | null;
  pathname?: string;
  cookieHeader?: string;
  acceptLanguageHeader?: string;
}

export interface DetectLocaleResult {
  locale: SupportedLocale;
  redirectPath?: string;
  detectedFrom: 'path' | 'cookie' | 'header' | 'default';
}

function fromPath(pathname?: string): string | undefined {
  if (!pathname) return undefined;
  const segments = pathname.split('?')[0]?.split('#')[0]?.split('/').filter(Boolean) ?? [];
  if (segments.length === 0) return undefined;
  const candidate = segments[0];
  return candidate;
}

export function parseAcceptLanguage(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => {
      const [tag, qValue] = entry.trim().split(';');
      const quality = qValue ? parseFloat(qValue.split('=')[1] ?? '1') : 1;
      return { tag: tag?.trim(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((item) => !!item.tag)
    .sort((a, b) => b.quality - a.quality)
    .map((item) => item.tag as string);
}

export function detectLocale({ req, pathname, cookieHeader, acceptLanguageHeader }: DetectLocaleInput): DetectLocaleResult {
  const cookies = parseCookies(cookieHeader ?? (typeof document !== 'undefined' ? document.cookie : undefined));
  const headerValue = acceptLanguageHeader ?? (typeof navigator !== 'undefined' ? navigator.language : undefined);
  const effectivePathname = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : undefined);
  const effectiveAsPath =
    pathname ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : '/');
  const pathLocale = fromPath(effectivePathname);

  let redirectPath: string | undefined;
  let detectedFrom: DetectLocaleResult['detectedFrom'] = 'default';

  const normalizedPathLocale = isSupportedLocale(pathLocale) ? normalizeLocale(pathLocale) : undefined;
  const cookieLocale = cookies[LOCALE_COOKIE];
  const normalizedCookieLocale = cookieLocale ? normalizeLocale(cookieLocale) : undefined;

  const headerCandidates = parseAcceptLanguage(headerValue)
    .map((value) => normalizeLocale(value))
    .filter((value) => value && isSupportedLocale(value));

  const fallbackOrder: Array<{ source: DetectLocaleResult['detectedFrom']; value?: SupportedLocale }> = [
    { source: 'path', value: normalizedPathLocale },
    { source: 'cookie', value: normalizedCookieLocale },
    { source: 'header', value: headerCandidates[0] },
    { source: 'default', value: DEFAULT_LOCALE },
  ];

  const resolved = fallbackOrder.find((entry) => entry.value);
  const locale = resolved?.value ?? DEFAULT_LOCALE;
  detectedFrom = resolved?.source ?? 'default';

  if (!redirectPath) {
    if (!normalizedPathLocale && locale !== DEFAULT_LOCALE) {
      redirectPath = resolveLocalePath(locale, effectiveAsPath);
    }
    if (normalizedPathLocale === DEFAULT_LOCALE && locale === DEFAULT_LOCALE) {
      // Keep default locale un-prefixed.
      redirectPath = resolveLocalePath(DEFAULT_LOCALE, effectiveAsPath);
    }
  }

  const shouldRedirect = redirectPath && normalizeAsPath(redirectPath) !== normalizeAsPath(effectiveAsPath);

  return { locale, redirectPath: shouldRedirect ? redirectPath : undefined, detectedFrom };
}

function normalizeAsPath(path?: string): string | undefined {
  if (!path) return undefined;
  return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
}

export function detectLocaleFromRequest(req: IncomingMessage | undefined | null, pathname?: string): DetectLocaleResult {
  return detectLocale({
    req,
    pathname,
    cookieHeader: getHeader(req, 'cookie'),
    acceptLanguageHeader: getHeader(req, 'accept-language'),
  });
}

export const AVAILABLE_LOCALES = Array.from(SUPPORTED_LOCALES);
