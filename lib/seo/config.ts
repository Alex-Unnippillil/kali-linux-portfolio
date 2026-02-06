export interface SeoLocaleDefinition {
  /**
   * Locale identifier used by Next.js routing. This typically maps to the
   * locale folder name when localized pages are added.
   */
  locale: string;
  /**
   * hreflang attribute value emitted for search engines.
   */
  hrefLang: string;
  /**
   * Locale identifier used for Open Graph tags (e.g. en_CA).
   */
  ogLocale: string;
  /**
   * Language code applied to the root <Html> element.
   */
  htmlLang: string;
  /**
   * Optional path prefix used for the locale (e.g. /fr for French pages).
   */
  pathPrefix?: string;
  /**
   * Marks the default locale. Used for canonical URLs and fallbacks.
   */
  isDefault?: boolean;
}

export interface AlternateLinkDefinition {
  href: string;
  hrefLang: string;
}

export const CANONICAL_ORIGIN = 'https://unnippillil.com';

const SEO_LOCALES: readonly SeoLocaleDefinition[] = [
  {
    locale: 'en',
    hrefLang: 'en-CA',
    ogLocale: 'en_CA',
    htmlLang: 'en',
    pathPrefix: '',
    isDefault: true,
  },
];

export const DEFAULT_SEO_LOCALE =
  SEO_LOCALES.find((locale) => locale.isDefault) ?? SEO_LOCALES[0];

const normalizedOrigin = CANONICAL_ORIGIN.replace(/\/+$/, '');

const normalizedBasePath = normalizeBasePath(
  process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? '',
);

function normalizeBasePath(basePath?: string | null): string {
  if (!basePath) return '';
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === '/') return '';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function normalizePath(path?: string | null): string {
  if (!path) return '/';
  const trimmed = path.trim();
  if (!trimmed) return '/';

  const withoutFragment = trimmed.split('#')[0];
  const withoutQuery = withoutFragment.split('?')[0];

  if (!withoutQuery) return '/';

  if (/^https?:\/\//i.test(withoutQuery)) {
    try {
      const url = new URL(withoutQuery);
      return url.pathname || '/';
    } catch {
      return '/';
    }
  }

  return withoutQuery.startsWith('/') ? withoutQuery || '/' : `/${withoutQuery}`;
}

function getNormalizedLocalePrefix(locale: SeoLocaleDefinition): string {
  const prefix = locale.pathPrefix ?? '';
  if (!prefix || prefix === '/') return '';
  const trimmed = prefix.trim();
  if (!trimmed || trimmed === '/') return '';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function stripBasePath(path: string): string {
  if (!normalizedBasePath) return path;
  if (path === normalizedBasePath) return '/';
  if (path.startsWith(`${normalizedBasePath}/`)) {
    const remainder = path.slice(normalizedBasePath.length);
    return remainder || '/';
  }
  return path;
}

function stripLocalePrefix(path: string): string {
  for (const locale of SEO_LOCALES) {
    const prefix = getNormalizedLocalePrefix(locale);
    if (!prefix) continue;
    if (path === prefix) return '/';
    if (path === `${prefix}/`) return '/';
    if (path.startsWith(`${prefix}/`)) {
      const remainder = path.slice(prefix.length);
      return remainder || '/';
    }
  }
  return path;
}

function applyLocalePrefix(path: string, locale: SeoLocaleDefinition): string {
  const prefix = getNormalizedLocalePrefix(locale);
  if (!prefix) return path;
  if (path === '/' || path === '') {
    return `${prefix}/`;
  }
  return `${prefix}${path}`;
}

function addBasePath(path: string): string {
  if (!normalizedBasePath) return path;
  if (path === '/' || path === '') {
    return normalizedBasePath || '/';
  }
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBasePath}/${trimmed}`;
}

function ensureLeadingSlash(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function ensureTrailingSlashForRoot(path: string, canonicalPath: string): string {
  if (canonicalPath !== '/') return path;
  const withoutTrailing = path.replace(/\/+$/, '');
  return `${withoutTrailing}/`;
}

function toAbsoluteUrl(path: string, canonicalPath: string): string {
  const withLeading = ensureLeadingSlash(path);
  const withTrailing = ensureTrailingSlashForRoot(withLeading, canonicalPath);
  return new URL(withTrailing, `${normalizedOrigin}/`).toString();
}

export function resolveCanonicalPath(asPath?: string | null): string {
  const normalizedPath = normalizePath(asPath);
  const withoutBase = stripBasePath(normalizedPath);
  const withoutLocale = stripLocalePrefix(withoutBase);
  return withoutLocale || '/';
}

export function buildCanonicalUrl(asPath?: string | null): string {
  const canonicalPath = resolveCanonicalPath(asPath);
  const localizedPath = applyLocalePrefix(canonicalPath, DEFAULT_SEO_LOCALE);
  const withBase = addBasePath(localizedPath);
  return toAbsoluteUrl(withBase, canonicalPath);
}

export function buildAlternateLinks(asPath?: string | null): AlternateLinkDefinition[] {
  const canonicalPath = resolveCanonicalPath(asPath);
  const links: AlternateLinkDefinition[] = SEO_LOCALES.map((locale) => {
    const localizedPath = applyLocalePrefix(canonicalPath, locale);
    const withBase = addBasePath(localizedPath);
    return {
      hrefLang: locale.hrefLang,
      href: toAbsoluteUrl(withBase, canonicalPath),
    };
  });

  const defaultHref = links.find(
    (link) => link.hrefLang === DEFAULT_SEO_LOCALE.hrefLang,
  )?.href;

  if (!links.some((link) => link.hrefLang.toLowerCase() === 'x-default')) {
    links.push({
      hrefLang: 'x-default',
      href: defaultHref ?? buildCanonicalUrl(asPath),
    });
  }

  return links;
}

export function getSeoLocales(): readonly SeoLocaleDefinition[] {
  return SEO_LOCALES;
}
