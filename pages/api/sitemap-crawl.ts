import type { NextApiRequest, NextApiResponse } from 'next';
import LRUCache from 'lru-cache';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

interface CrawlResponse {
  ok: boolean;
  status: number;
  time: number;
  cached?: boolean;
}

const cache = new LRUCache<string, { status: number; time: number }>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CrawlResponse>
) {
  const { url } = req.query;

  if (typeof url !== 'string') {
    res.status(200).json({ ok: false, status: 0, time: 0 });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(200).json({ ok: false, status: 0, time: 0 });
    return;
  }

  const key = parsed.toString();
  const cached = cache.get(key);
  if (cached) {
    res.status(200).json({ ok: true, ...cached, cached: true });
    return;
  }

  try {
    const start = Date.now();
    const response = await fetch(parsed.toString());
    const time = Date.now() - start;
    const result = { status: response.status, time };
    cache.set(key, result);
    res.status(200).json({ ok: true, ...result, cached: false });
  } catch {
    res.status(200).json({ ok: false, status: 0, time: 0 });
  }
}
