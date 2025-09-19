import type { MetadataRoute } from 'next';

const PRODUCTION_ENV = 'production';

const normalizeEnv = (value?: string | null) => value?.toLowerCase() ?? '';
const trimTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  const env = normalizeEnv(process.env.NEXT_PUBLIC_ENV ?? process.env.NODE_ENV);
  const isProduction = env === PRODUCTION_ENV;

  const allow = isProduction ? ['/'] : [];
  const disallow = isProduction ? [] : ['/'];

  const rules: MetadataRoute.Robots['rules'] = {
    userAgent: '*',
    ...(allow.length ? { allow } : {}),
    ...(disallow.length ? { disallow } : {}),
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const sitemapUrl =
    isProduction && siteUrl ? `${trimTrailingSlash(siteUrl)}/sitemap.xml` : undefined;

  return {
    rules,
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  };
}
