import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate-server';
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

interface ApiResponse {
  results: CertResult[];
  total: number;
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

  const querySchema = z.object({
    domain: z.string(),
    subdomains: z.string().optional(),
    issuer: z.string().optional(),
    notAfter: z.string().optional(),
    page: z.string().optional(),
    perPage: z.string().optional(),
  });
  const parsed = validateRequest(req, res, { querySchema });
  if (!parsed) return;
  const {
    domain,
    subdomains = 'true',
    issuer,
    notAfter,
    page = '1',
    perPage = '50',
  } = parsed.query as any;

  const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
  const perPageNum = Math.min(
    Math.max(parseInt(perPage as string, 10) || 50, 1),
    500
  );

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  const retry = checkRateLimit(ip);
  if (retry !== null) {
    res.setHeader('Retry-After', Math.ceil(retry / 1000).toString());
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const key = `${domain}|${subdomains}|${issuer || ''}|${notAfter || ''}`;
  const cached = cache.get(key);
  if (cached) {
    const total = cached.results.length;
    const start = (pageNum - 1) * perPageNum;
    const paged = cached.results.slice(start, start + perPageNum);
    const payload: ApiResponse = { results: paged, total };
    return res.status(200).json(payload);
  }

  let search: string;
  if (domain.includes('*') || domain.includes('%')) {
    search = domain.replace(/\*/g, '%');
  } else {
    search = subdomains === 'true' ? `%.${domain}` : domain;
  }
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
    let results: CertResult[] = data.map((item: any) => ({
      certId: Number(item.id || item.min_cert_id || item.cert_id),
      issuer: item.issuer_name as string,
      notBefore: item.not_before as string,
      notAfter: item.not_after as string,
      sans: String(item.name_value || '')
        .split('\n')
        .filter(Boolean),
    }));

    if (issuer && typeof issuer === 'string') {
      const needle = issuer.toLowerCase();
      results = results.filter((r) => r.issuer.toLowerCase().includes(needle));
    }

    if (notAfter && typeof notAfter === 'string') {
      const cutoff = new Date(notAfter);
      if (!isNaN(cutoff.valueOf())) {
        results = results.filter((r) => new Date(r.notAfter) <= cutoff);
      }
    }

    const cacheEntry: CacheEntry = { results };
    cache.set(key, cacheEntry);

    const total = results.length;
    const start = (pageNum - 1) * perPageNum;
    const paged = results.slice(start, start + perPageNum);
    const payload: ApiResponse = { results: paged, total };
    return res.status(200).json(payload);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}

