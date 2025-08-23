import type { NextApiRequest, NextApiResponse } from 'next';

interface CacheEntry<T> {
  expiry: number;
  data: T;
}

const cache = new Map<string, CacheEntry<any>>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5;
const rateLimit = new Map<string, { count: number; start: number }>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.data as T;
  }
  if (entry) cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record || now - record.start > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { count: 1, start: now });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count += 1;
  return true;
}

async function fetchShodan(key: string, query: string) {
  const cacheKey = `shodan:${query}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return cached;
  const url = `https://api.shodan.io/shodan/host/search?key=${encodeURIComponent(
    key
  )}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Shodan error: ${res.status}`);
  }
  const data = await res.json();
  setCache(cacheKey, data, 60 * 1000); // cache 1 minute
  return data;
}

interface NvdInfo {
  id: string;
  description: string;
}

async function fetchCve(id: string): Promise<NvdInfo> {
  const cacheKey = `cve:${id}`;
  const cached = getCache<NvdInfo>(cacheKey);
  if (cached) return cached;
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(
    id
  )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('NVD fetch failed');
  const json = await res.json();
  const cve = json.vulnerabilities?.[0]?.cve;
  const description = cve?.descriptions?.[0]?.value || '';
  const info = { id, description };
  setCache(cacheKey, info, 5 * 60 * 1000); // 5 minutes
  return info;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { key, query, agree } = req.body as {
    key?: string;
    query?: string;
    agree?: boolean;
  };

  if (!agree) {
    res
      .status(400)
      .json({ error: 'You must agree to the terms of service.' });
    return;
  }

  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'API key is required.' });
    return;
  }
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Query is required.' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded.' });
    return;
  }

  try {
    const shodanData = await fetchShodan(key, query);
    const matches = await Promise.all(
      (shodanData.matches || []).map(async (m: any) => {
        const vulns = m.vulns ? Object.keys(m.vulns) : [];
        const nvd: NvdInfo[] = [];
        // sequential fetch with Promise.all
        for (const id of vulns) {
          try {
            const info = await fetchCve(id);
            nvd.push(info);
          } catch (e) {
            // ignore failure for individual CVE
          }
        }
        return { ...m, nvd };
      })
    );

    res.status(200).json({ query, matches });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error fetching data.' });
  }
}

