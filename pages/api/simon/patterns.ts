import type { NextApiRequest, NextApiResponse } from 'next';

const patterns: number[][] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ patterns });
    return;
  }
  if (req.method === 'POST') {
    const { pattern } = req.body || {};
    if (
      Array.isArray(pattern) &&
      pattern.every((n) => typeof n === 'number' && n >= 0 && n < 4)
    ) {
      patterns.push(pattern);
    }
    res.status(200).json({ patterns });
    return;
  }
  res.status(405).end();
}
