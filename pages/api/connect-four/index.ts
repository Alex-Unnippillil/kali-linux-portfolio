import type { NextApiRequest, NextApiResponse } from 'next';

type Match = { id: number; winner: string; moves: number; timestamp: number };

const history: Match[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json(history);
  } else if (req.method === 'POST') {
    const { winner, moves } = req.body;
    if (!winner) {
      res.status(400).json({ error: 'winner required' });
      return;
    }
    const match: Match = { id: Date.now(), winner, moves, timestamp: Date.now() };
    history.push(match);
    res.status(201).json(match);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end('Method Not Allowed');
  }
}

