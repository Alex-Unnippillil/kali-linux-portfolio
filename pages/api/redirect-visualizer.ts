import type { NextApiRequest, NextApiResponse } from 'next';
import { Agent } from 'undici';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

const MAX_HOPS = 15;
const MAX_HEADER_BYTES = 1024 * 1024; // 1MB
const ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];

const agents: Record<string, Agent> = {
  'http:': new Agent({ keepAliveTimeout: 10_000 }),
  'https:': new Agent({ keepAliveTimeout: 10_000 }),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, chain: [] });
  }

  const { url, method } = req.body || {};

  if (typeof url !== 'string' || !url) {
    return res.status(400).json({ ok: false, chain: [] });
  }

  const upperMethod =
    typeof method === 'string' && method.trim()
      ? method.toUpperCase()
      : 'GET';
  if (!ALLOWED_METHODS.includes(upperMethod)) {
    return res.status(400).json({ ok: false, chain: [] });
  }

  try {
    // Validate URL format
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    return res.status(400).json({ ok: false, chain: [] });
  }

  const chain: {
    url: string;
    status: number;
    location?: string;
    setCookie?: string;
    hsts?: string;
    altSvc?: string;
    time: number;
  }[] = [];
  let current = url;
  const visited = new Set<string>([current]);
  let headerBytes = 0;

  try {
    for (let i = 0; i < MAX_HOPS; i += 1) {
      const start = Date.now();
      const urlObj = new URL(current);
      const response = await fetch(current, {
        method: upperMethod,
        redirect: 'manual',
        // @ts-ignore - dispatcher is undici-specific
        dispatcher: agents[urlObj.protocol],
      } as any);
      const time = Date.now() - start;
      const location = response.headers.get('location') || undefined;
      const setCookie = response.headers.get('set-cookie') || undefined;
      const hsts = response.headers.get('strict-transport-security') || undefined;
      const altSvc = response.headers.get('alt-svc') || undefined;

      headerBytes += [...response.headers].reduce(
        (sum, [k, v]) => sum + k.length + v.length + 4,
        0,
      );

      chain.push({
        url: current,
        status: response.status,
        location,
        setCookie,
        hsts,
        altSvc,
        time,
      });

      if (headerBytes > MAX_HEADER_BYTES) {
        return res.status(200).json({ ok: false, chain });
      }

      if (response.status >= 300 && response.status < 400 && location) {
        const nextUrl = new URL(location, current).toString();
        if (visited.has(nextUrl)) {
          return res.status(200).json({ ok: false, chain });
        }
        visited.add(nextUrl);
        current = nextUrl;
      } else {
        return res.status(200).json({ ok: true, chain });
      }
    }

    return res.status(200).json({ ok: false, chain });
  } catch {
    return res.status(500).json({ ok: false, chain });
  }
}

