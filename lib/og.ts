export type OgTheme = 'dark' | 'light';

export interface BuildOgImageUrlOptions {
  baseUrl?: string;
  path?: string;
  title?: string;
  subtitle?: string;
  locale?: string;
  theme?: OgTheme;
  project?: string;
  badges?: string[];
  image?: string;
}

const DEFAULT_BASE_URL = 'https://unnippillil.com';
const DEFAULT_PATH = '/api/og';
const DEFAULT_LOCALE = 'en';

const SLUG_PATTERN = /[^a-z0-9]+/gi;

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const normalizeBaseUrl = (value?: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_BASE_URL;
  }
  if (isHttpUrl(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export const slugify = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.replace(SLUG_PATTERN, '-').replace(/^-+|-+$/g, '');
};

export const sanitizeLocale = (value?: string | null): string => {
  if (!value) return DEFAULT_LOCALE;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOCALE;
  const normalized = trimmed.replace(/_/g, '-');
  const cleaned = normalized.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const collapsed = cleaned
    .split('-')
    .filter(Boolean)
    .join('-');
  if (!collapsed) {
    return DEFAULT_LOCALE;
  }
  const isLikelyLocale = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(collapsed);
  return isLikelyLocale ? collapsed : DEFAULT_LOCALE;
};

export const buildOgImageUrl = ({
  baseUrl,
  path,
  title,
  subtitle,
  locale,
  theme,
  project,
  badges,
  image,
}: BuildOgImageUrlOptions = {}): string => {
  const origin = normalizeBaseUrl(baseUrl);
  const ogPath = path ?? DEFAULT_PATH;
  const url = new URL(ogPath.startsWith('/') ? ogPath : `/${ogPath}`, origin);

  const finalTitle = title?.trim();
  if (finalTitle) {
    url.searchParams.set('title', finalTitle);
  }

  const finalSubtitle = subtitle?.trim();
  if (finalSubtitle) {
    url.searchParams.set('subtitle', finalSubtitle);
  }

  const sanitizedLocale = sanitizeLocale(locale);
  if (sanitizedLocale && sanitizedLocale !== DEFAULT_LOCALE) {
    url.searchParams.set('locale', sanitizedLocale);
  }

  if (theme === 'light') {
    url.searchParams.set('theme', 'light');
  }

  const projectSlug = slugify(project);
  if (projectSlug) {
    url.searchParams.set('project', projectSlug);
  }

  const uniqueBadges = Array.from(
    new Set((badges ?? []).map((badge) => badge?.trim()).filter((badge): badge is string => Boolean(badge)))
  ).slice(0, 6);

  uniqueBadges.forEach((badge) => {
    url.searchParams.append('badge', badge);
  });

  const cleanedImage = image?.trim();
  if (cleanedImage) {
    url.searchParams.set('image', cleanedImage);
  }

  return url.toString();
};

export const resolveCanonicalUrl = (baseUrl?: string, path?: string): string => {
  const origin = normalizeBaseUrl(baseUrl);
  if (!path) {
    return origin;
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return origin;
  }
  try {
    const url = new URL(trimmed, origin);
    return url.toString();
  } catch {
    return origin;
  }
};

export const DEFAULT_SITE_URL = DEFAULT_BASE_URL;
