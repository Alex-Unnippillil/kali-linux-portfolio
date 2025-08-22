import type { NextApiRequest, NextApiResponse } from 'next';
import { readDB, writeDB } from '../../../lib/reversi-db';

function pairings(players: string[]): string[][] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const pairs: string[][] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1] ?? null]);
  }
  return pairs;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = readDB();
  if (req.method === 'GET') {
    res.status(200).json({ tournaments: db.tournaments });
    return;
  }
  if (req.method === 'POST') {
    const { players } = req.body as { players: string[] };
    if (!players || !Array.isArray(players) || players.length === 0) {
      res.status(400).json({ error: 'players required' });
      return;
    }
    const id = Date.now();
    const bracket = pairings(players);
    db.tournaments.push({ id, players, bracket });
    writeDB(db);
    res.status(200).json({ id, bracket });
    return;
  }
  res.status(405).end();
}
