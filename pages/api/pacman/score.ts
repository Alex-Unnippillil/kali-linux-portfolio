import type { NextApiRequest, NextApiResponse } from 'next';

let scores: number[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { score } = req.body as { score: number };
    if (typeof score === 'number') scores.push(score);
    res.status(200).json({ ok: true });
  } else if (req.method === 'GET') {
    res.status(200).json({ scores });
  } else {
    res.status(405).end();
  }
}
