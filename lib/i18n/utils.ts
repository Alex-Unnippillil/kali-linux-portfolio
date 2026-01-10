import type { IncomingMessage, ServerResponse } from 'http';
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, type SupportedLocale } from './constants';

export const supportedLocales = new Set<string>(SUPPORTED_LOCALES);

export function normalizeLocale(raw?: string | null): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_LOCALE;
  const lower = trimmed.toLowerCase();
  const exact = Array.from(supportedLocales).find((locale) => locale.toLowerCase() === lower);
  if (exact) return exact as SupportedLocale;
  const primary = lower.split('-')[0];
  const primaryMatch = Array.from(supportedLocales).find((locale) => locale.toLowerCase() === primary);
  if (primaryMatch) return primaryMatch as SupportedLocale;
  return DEFAULT_LOCALE;
}

export function isSupportedLocale(locale?: string | null): locale is SupportedLocale {
  if (!locale) return false;
  return supportedLocales.has(locale);
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, entry) => {
    const [name, ...rest] = entry.split('=');
    if (!name) return acc;
    const value = rest.join('=');
    acc[name.trim()] = decodeURIComponent(value?.trim() ?? '');
    return acc;
  }, {});
}

export interface CookieSerializeOptions {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

export function serializeLocaleCookie(
  locale: string,
  { maxAgeSeconds = 60 * 60 * 24 * 365, path = '/', sameSite = 'lax', secure }: CookieSerializeOptions = {},
): string {
  const parts = [`${LOCALE_COOKIE}=${encodeURIComponent(locale)}`];
  if (path) parts.push(`Path=${path}`);
  if (typeof maxAgeSeconds === 'number') parts.push(`Max-Age=${Math.floor(maxAgeSeconds)}`);
  if (sameSite) parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function appendSetCookieHeader(res: ServerResponse, cookie: string): void {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', [existing.toString(), cookie]);
  }
}

export function resolveLocalePath(locale: string, asPath: string): string {
  const [pathWithQuery, hash = ''] = asPath.split('#');
  const [pathPart, query = ''] = pathWithQuery.split('?');
  const pathSegments = pathPart.split('/').filter(Boolean);

  const currentLocale = pathSegments.length > 0 && isSupportedLocale(pathSegments[0]) ? pathSegments[0] : null;
  const restSegments = currentLocale ? pathSegments.slice(1) : pathSegments;

  let nextPath = '';
  if (locale === DEFAULT_LOCALE) {
    nextPath = `/${restSegments.join('/')}`;
  } else {
    nextPath = `/${locale}${restSegments.length ? `/${restSegments.join('/')}` : ''}`;
  }

  if (nextPath === '') nextPath = '/';

  const queryPart = query ? `?${query}` : '';
  const hashPart = hash ? `#${hash}` : '';
  return `${nextPath}${queryPart}${hashPart}`;
}

export function getHeader(req?: IncomingMessage, name?: string): string | undefined {
  if (!req || !name) return undefined;
  const value = req.headers?.[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value as string | undefined;
}

