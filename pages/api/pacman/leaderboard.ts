import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface Entry {
  name: string;
  score: number;
}

const filePath = path.join(process.cwd(), 'data', 'pacman-leaderboard.json');
const MAX_ENTRIES = 10;

function readBoard(): Entry[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as Entry[];
    return [];
  } catch {
    return [];
  }
}

function writeBoard(board: Entry[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(board, null, 2));
  } catch {
    // ignore write errors
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Entry[]>,
) {
  if (req.method === 'GET') {
    res.status(200).json(readBoard());
    return;
  }

  if (req.method === 'POST') {
    const { name, score } = req.body as Partial<Entry>;
    if (typeof name !== 'string' || typeof score !== 'number') {
      res.status(400).json(readBoard());
      return;
    }
    const board = readBoard();
    board.push({ name: name.slice(0, 20), score });
    board.sort((a, b) => b.score - a.score);
    const trimmed = board.slice(0, MAX_ENTRIES);
    writeBoard(trimmed);
    res.status(200).json(trimmed);
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
