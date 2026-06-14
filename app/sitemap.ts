import type { MetadataRoute } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? 'https://unnippillil.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
    },
  ];
}
