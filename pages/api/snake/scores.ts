import type { NextApiRequest, NextApiResponse } from 'next';

export interface ScoresResponse {
  scores: number[];
}

interface PostBody {
  score?: number;
}

let scores: number[] = [];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScoresResponse | { error: string }>,
) {
  if (req.method === 'GET') {
    return res.status(200).json({ scores });
  }
  if (req.method === 'POST') {
    const { score }: PostBody = req.body || {};
    if (typeof score === 'number' && !Number.isNaN(score)) {
      scores.push(score);
      scores.sort((a, b) => b - a);
      scores = scores.slice(0, 10);
    }
    return res.status(201).json({ scores });
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
