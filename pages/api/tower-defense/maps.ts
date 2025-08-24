import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '../../../lib/kv';

const PREFIX = 'tower-defense-map:';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const data = req.body;
    const key = PREFIX + Date.now();
    await kv.set(key, data);
    res.status(200).json({ saved: true });
  } else {
    res.status(405).end();
  }
}
