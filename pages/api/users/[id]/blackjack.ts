import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const DATA_PATH = path.join(process.cwd(), 'data', 'blackjack.json');

interface Stats {
  wins: number;
  losses: number;
  pushes: number;
  bankroll: number;
}

function readStats(): Record<string, Stats> {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '{}', 'utf8');
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw || '{}');
}

function writeStats(data: Record<string, Stats>) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const token = req.headers.authorization?.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'secret';

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    jwt.verify(token, secret);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const stats = readStats();
  const userStats = stats[id as string] || { wins: 0, losses: 0, pushes: 0, bankroll: 1000 };

  if (req.method === 'GET') {
    return res.status(200).json(userStats);
  }

  if (req.method === 'POST') {
    const { result, bankroll } = req.body;
    if (result === 'win') userStats.wins++;
    if (result === 'loss') userStats.losses++;
    if (result === 'push') userStats.pushes++;
    if (typeof bankroll === 'number') userStats.bankroll = bankroll;
    stats[id as string] = userStats;
    writeStats(stats);
    return res.status(200).json(userStats);
  }

  return res.status(405).end();
}
