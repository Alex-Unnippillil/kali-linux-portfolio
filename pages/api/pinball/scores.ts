import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'pinballScores.json');

function readScores() {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(readScores());
  }

  if (req.method === 'POST') {
    const { score, name = 'Anonymous', replay = [] } = req.body || {};
    const scores = readScores();
    scores.push({ name, score, replay, date: new Date().toISOString() });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(scores, null, 2));
    return res.status(201).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
