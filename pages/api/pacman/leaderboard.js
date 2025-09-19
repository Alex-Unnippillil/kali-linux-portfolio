import fs from '../../../lib/server/fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'pacman-leaderboard.json');
const MAX_ENTRIES = 10;

function readBoard() {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

function writeBoard(board) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(board, null, 2));
  } catch {
    // ignore write errors
  }
}

export default function handler(
  req,
  res,
) {
  if (req.method === 'GET') {
    res.status(200).json(readBoard());
    return;
  }

  if (req.method === 'POST') {
    const { name, score } = req.body || {};
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
