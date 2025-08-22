import type { NextApiRequest, NextApiResponse } from 'next';

let scores: number[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ scores });
    return;
  }
  if (req.method === 'POST') {
    const { score } = req.body || {};
    if (typeof score === 'number' && !Number.isNaN(score)) {
      scores.push(score);
      scores.sort((a, b) => b - a);
      scores = scores.slice(0, 10);
    }
    res.status(201).json({ scores });
    return;
  }
  res.status(405).end();
}
