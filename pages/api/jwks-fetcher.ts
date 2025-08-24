import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate';

interface CacheEntry {
  keys: any[];
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000; // 5 minutes

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
};

const querySchema = z.object({ jwksUrl: z.string().url() });
const bodySchema = z.object({});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const parsed = validateRequest(req, res, {
    querySchema,
    bodySchema,
    queryLimit: 1024,
    bodyLimit: 1024,
  });
  if (!parsed) return;
  const { jwksUrl } = parsed.query;

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
