import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';

const MIRRORBITS_URL = 'https://http.kali.org/README';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const response = await fetch(MIRRORBITS_URL, { method: 'HEAD' });
    const data = {
      status: response.status,
      checkedAt: Date.now(),
    };
    await kv.set('mirrorbits:status', data);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'mirrorbits check failed' });
  }
}
