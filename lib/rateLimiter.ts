import type { NextApiRequest, NextApiResponse } from 'next';

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60;

type Entry = { count: number; expires: number };
const map = new Map<string, Entry>();

function getKey(req: NextApiRequest | Request): string {
  const headers = req instanceof Request ? req.headers : req.headers as any;
  const xf = headers.get ? headers.get('x-forwarded-for') : (headers['x-forwarded-for'] as string);
  const ip = xf ? xf.split(',')[0].trim() :
    (req instanceof Request ? undefined : req.socket.remoteAddress);
  return ip || 'unknown';
}

function checkLimit(key: string, limit: number) {
  const now = Date.now();
  let entry = map.get(key);
  if (!entry || entry.expires <= now) {
    entry = { count: 0, expires: now + WINDOW_MS };
  }
  entry.count += 1;
  map.set(key, entry);
  const remaining = limit - entry.count;
  return { allowed: entry.count <= limit, remaining, reset: Math.ceil((entry.expires - now) / 1000) };
}

export function rateLimit(req: NextApiRequest, res: NextApiResponse, limit = MAX_REQUESTS) {
  const key = getKey(req);
  const { allowed, remaining, reset } = checkLimit(key, limit);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  if (!allowed) {
    res.setHeader('Retry-After', String(reset));
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }
  return true;
}

export function rateLimitEdge(req: Request, limit = MAX_REQUESTS) {
  const key = getKey(req);
  const { allowed, remaining, reset } = checkLimit(key, limit);
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
  };
  if (!allowed) {
    headers['Retry-After'] = String(reset);
    return { limited: true, headers } as const;
  }
  return { limited: false, headers } as const;
}
