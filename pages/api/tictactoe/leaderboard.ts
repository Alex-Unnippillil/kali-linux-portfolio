import type { NextApiRequest, NextApiResponse } from 'next';

interface GameRecord {
  winner: 'X' | 'O' | 'draw';
}

const games: GameRecord[] = [];
const leaderboard: { [key: string]: number } = { X: 0, O: 0, draw: 0 };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { winner } = req.body as { winner?: string };
    if (winner === 'X' || winner === 'O' || winner === 'draw') {
      games.push({ winner });
      leaderboard[winner] = (leaderboard[winner] || 0) + 1;
    }
    res.status(200).json({ leaderboard, games });
    return;
  }

  res.status(200).json({ leaderboard, games });
}

