import type { NextApiRequest, NextApiResponse } from 'next';
import { readDB, writeDB } from '../../../lib/reversi-db';

const K = 32;

function expected(a: number, b: number) {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await readDB();
  if (req.method === 'GET') {
    res.status(200).json({ matches: db.matches, ratings: db.ratings });
    return;
  }
  if (req.method === 'POST') {
    const { white, black, winner } = req.body as { white: string; black: string; winner: string };
    if (!white || !black || !winner) {
      res.status(400).json({ error: 'missing fields' });
      return;
    }
    const rw = db.ratings[white] ?? 1200;
    const rb = db.ratings[black] ?? 1200;
    const ew = expected(rw, rb);
    const eb = expected(rb, rw);
    const sw = winner === white ? 1 : 0;
    const sb = winner === black ? 1 : 0;
    db.ratings[white] = Math.round(rw + K * (sw - ew));
    db.ratings[black] = Math.round(rb + K * (sb - eb));
    db.matches.push({ white, black, winner, time: Date.now() });
    await writeDB(db);
    res.status(200).json({ ratings: db.ratings });
    return;
  }
  res.status(405).end();
}
