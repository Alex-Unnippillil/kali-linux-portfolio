import type { NextApiRequest, NextApiResponse } from 'next';
import { Agent } from 'undici';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

const agents: Record<string, Agent> = {
  'http:': new Agent({ keepAliveTimeout: 10_000 }),
  'https:': new Agent({ keepAliveTimeout: 10_000 }),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ cookies: [] });
  }

  const { url } = req.body || {};
  if (typeof url !== 'string' || !url) {
    return res.status(400).json({ cookies: [] });
  }

  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    return res.status(400).json({ cookies: [] });
  }

  try {
    const urlObj = new URL(url);
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      // @ts-ignore - dispatcher is undici-specific
      dispatcher: agents[urlObj.protocol],
    } as any);
    const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    return res.status(200).json({ cookies });
  } catch {
    return res.status(500).json({ cookies: [] });
  }
}
