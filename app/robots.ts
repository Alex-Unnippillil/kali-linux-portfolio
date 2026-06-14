import type { MetadataRoute } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? 'https://unnippillil.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
