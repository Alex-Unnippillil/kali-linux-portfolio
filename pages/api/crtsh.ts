import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

interface CertResult {
  certId: number;
  issuer: string;
  notBefore: string;
  notAfter: string;
  sans: string[];
}

interface CacheEntry {
  results: CertResult[];
}

const cache = new LRUCache<string, CacheEntry>({ max: 100, ttl: 10 * 60 * 1000 });
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimit = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): number | null {
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record || now > record.reset) {
    rateLimit.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return null;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return record.reset - now;
  }
  record.count++;
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, subdomains = 'true' } = req.query;
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing domain' });
  }

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  const retry = checkRateLimit(ip);
  if (retry !== null) {
    res.setHeader('Retry-After', Math.ceil(retry / 1000).toString());
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const key = `${domain}|${subdomains}`;
  const cached = cache.get(key);
  if (cached) {
    return res.status(200).json(cached);
  }

  const search = subdomains === 'true' ? `%25.${domain}` : domain;
  try {
    const response = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(search)}&output=json`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (response.status === 429) {
      return res.status(429).json({ error: 'Upstream rate limit exceeded' });
    }

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: 'Upstream server error' });
    }

    const data = await response.json();
    const results: CertResult[] = data.map((item: any) => ({
      certId: Number(item.id || item.min_cert_id || item.cert_id),
      issuer: item.issuer_name as string,
      notBefore: item.not_before as string,
      notAfter: item.not_after as string,
      sans: String(item.name_value || '')
        .split('\n')
        .filter(Boolean),
    }));

    const payload: CacheEntry = { results };
    cache.set(key, payload);
    return res.status(200).json(payload);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}

