import https from 'https';
import type { IncomingHttpHeaders } from 'http';

interface CacheEntry {
  headers: IncomingHttpHeaders;
  alpn: string;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

export async function fetchHead(url: string): Promise<{ headers: IncomingHttpHeaders; alpn: string }> {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return { headers: cached.headers, alpn: cached.alpn };
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      const alpn = (res.socket as any).alpnProtocol || 'unknown';
      const headers = res.headers;
      cache.set(url, { headers, alpn, timestamp: Date.now() });
      resolve({ headers, alpn });
    });
    req.on('error', reject);
    req.end();
  });
}
