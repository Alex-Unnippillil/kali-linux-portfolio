import type { NextApiRequest, NextApiResponse } from 'next';

const MAX_HOPS = 10;
const ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, chain: [] });
  }

  const { url, method = 'GET' } = req.body || {};

  if (typeof url !== 'string' || !url) {
    return res.status(400).json({ ok: false, chain: [] });
  }

  const upperMethod = typeof method === 'string' ? method.toUpperCase() : '';
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

  const chain: { url: string; status: number; location?: string }[] = [];
  let current = url;
  const visited = new Set<string>([current]);

  try {
    for (let i = 0; i < MAX_HOPS; i += 1) {
      const response = await fetch(current, {
        method: upperMethod,
        redirect: 'manual',
      });
      const location = response.headers.get('location') || undefined;
      chain.push({ url: current, status: response.status, location });

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

