import type { NextApiRequest, NextApiResponse } from 'next';

type Score = { name: string; time: number };
let scores: Score[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(scores.sort((a, b) => a.time - b.time).slice(0, 10));
  }
  if (req.method === 'POST') {
    const { name, time } = req.body || {};
    if (typeof name !== 'string' || typeof time !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    scores.push({ name, time });
    scores = scores.sort((a, b) => a.time - b.time).slice(0, 10);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).end();
}
