import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';
import { Readable } from 'node:stream';
import { parseSitemap, SitemapEntry } from '../../lib/sitemap';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

interface HeatmapResponse {
  ok: boolean;
  urls: SitemapEntry[];
}

const cache = new LRUCache<string, SitemapEntry[]>({
  max: 10,
  ttl: 1000 * 60 * 5,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HeatmapResponse>
) {
  const { origin } = req.query;

  if (typeof origin !== 'string') {
    res.status(200).json({ ok: false, urls: [] });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    res.status(200).json({ ok: false, urls: [] });
    return;
  }

  const cacheKey = parsed.origin;
  try {
    let urls = cache.get(cacheKey);
    if (!urls) {
      const response = await fetch(`${parsed.origin}/sitemap.xml`);
      if (!response.ok || !response.body) {
        res.status(200).json({ ok: false, urls: [] });
        return;
      }

      const stream = Readable.fromWeb(response.body as any);
      urls = await parseSitemap(stream);
      cache.set(cacheKey, urls);
    }

    res.status(200).json({ ok: true, urls });
  } catch {
    res.status(200).json({ ok: false, urls: [] });
  }
}

