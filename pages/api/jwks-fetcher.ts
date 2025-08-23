import type { NextApiRequest, NextApiResponse } from 'next';

interface CacheEntry {
  keys: any[];
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { jwksUrl } = req.query;
  if (typeof jwksUrl !== 'string') {
    res.status(400).json({ ok: false, keys: [] });
    return;
  }

  try {
    const url = new URL(jwksUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error('invalid');
  } catch {
    res.status(400).json({ ok: false, keys: [] });
    return;
  }

  const cached = cache.get(jwksUrl);
  if (cached && cached.expiry > Date.now()) {
    res.status(200).json({ ok: true, keys: cached.keys });
    return;
  }

  try {
    const resp = await fetch(jwksUrl);
    if (!resp.ok) throw new Error('fetch failed');
    const json = await resp.json();
    const keys = Array.isArray(json.keys) ? json.keys : [];
    cache.set(jwksUrl, { keys, expiry: Date.now() + TTL });
    res.status(200).json({ ok: true, keys });
  } catch {
    res.status(500).json({ ok: false, keys: [] });
  }
}
