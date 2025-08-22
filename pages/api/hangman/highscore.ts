import type { NextApiRequest, NextApiResponse } from 'next';

interface ScoreEntry {
  theme: string;
  difficulty: string;
  score: number;
}

const scores: ScoreEntry[] = [];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === 'POST') {
    const { theme, difficulty, score } = req.body as ScoreEntry;
    if (typeof score === 'number') {
      scores.push({ theme, difficulty, score });
      scores.sort((a, b) => b.score - a.score);
    }
    res.status(200).json({ ok: true });
  } else if (req.method === 'GET') {
    res.status(200).json(scores.slice(0, 10));
  } else {
    res.status(405).end();
  }
}
