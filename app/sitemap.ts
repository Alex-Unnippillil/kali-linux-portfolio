import type { MetadataRoute } from 'next';

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const coreRoutes = ['', 'terminal', 'files', 'settings'];

const buildUrl = (path: string) => (path ? `${baseUrl}/${path}` : baseUrl);

export default function sitemap(): MetadataRoute.Sitemap {
  return coreRoutes.map((path) => ({
    url: buildUrl(path),
    changeFrequency: 'daily',
  }));
}
