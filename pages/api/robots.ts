import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

interface RobotsResponse {
  disallows: string[];
  sitemapEntries: SitemapEntry[];
  missingRobots?: boolean;
}

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
};

const querySchema = z.object({ url: z.string().url() });
const bodySchema = z.object({});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RobotsResponse | { error: string }>
) {
  const parsed = validateRequest(req, res, {
    querySchema,
    bodySchema,
    queryLimit: 1024,
    bodyLimit: 1024,
  });
  if (!parsed) return;
  const { url } = parsed.query as { url: string };

  const base = url.replace(/\/$/, '');
  let robotsText = '';
  try {
    const robotsRes = await fetch(`${base}/robots.txt`);
    if (!robotsRes.ok) {
      res.status(200).json({ disallows: [], sitemapEntries: [], missingRobots: true });
      return;
    }
    robotsText = await robotsRes.text();
  } catch (e) {
    res.status(200).json({ disallows: [], sitemapEntries: [], missingRobots: true });
    return;
  }

  const disallows: string[] = [];
  const sitemapUrls: string[] = [];
  robotsText.split(/\r?\n/).forEach((line) => {
    const cleaned = line.split('#')[0].trim();
    if (!cleaned) return;
    const [directive, value] = cleaned.split(':').map((s) => s.trim());
    if (/^disallow$/i.test(directive)) {
      disallows.push(value || '/');
    } else if (/^sitemap$/i.test(directive) && value) {
      sitemapUrls.push(value);
    }
  });

  const sitemapEntries: SitemapEntry[] = [];
  await Promise.all(
    sitemapUrls.map(async (sitemapUrl) => {
      try {
        const sitemapRes = await fetch(sitemapUrl);
        if (!sitemapRes.ok) return;
        const xml = await sitemapRes.text();
        const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);
        const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/gi)].map((m) => m[1]);
        locs.forEach((loc, idx) => {
          sitemapEntries.push({ loc, lastmod: lastmods[idx] });
        });
      } catch (e) {
        // ignore individual sitemap errors
      }
    })
  );

  res.status(200).json({ disallows, sitemapEntries });
}

