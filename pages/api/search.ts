import type { NextApiRequest, NextApiResponse } from 'next';
import { searchAll } from '../../lib/search';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const q = (req.query.q as string) || '';
  if (!q) {
    res.status(400).json({ error: 'missing query' });
    return;
  }
  const results = await searchAll(q);
  res.status(200).json(results);
}
