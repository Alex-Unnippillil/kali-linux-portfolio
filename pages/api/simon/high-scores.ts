import type { NextApiRequest, NextApiResponse } from 'next';

let highScore = 0;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ highScore });
    return;
  }
  if (req.method === 'POST') {
    const { score } = req.body || {};
    if (typeof score === 'number' && score > highScore) {
      highScore = score;
    }
    res.status(200).json({ highScore });
    return;
  }
  res.status(405).end();
}
