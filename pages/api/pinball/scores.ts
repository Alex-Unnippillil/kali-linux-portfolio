import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { readJson, writeJson } from '../../../lib/store';

const filePath = path.join(process.cwd(), 'data', 'pinballScores.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const scores = await readJson(filePath, [] as any[]);
    res.status(200).json(scores);
    return;
  }

  if (req.method === 'POST') {
    const { score, name = 'Anonymous', replay = [] } = req.body || {};
    const scores = await readJson(filePath, [] as any[]);
    scores.push({ name, score, replay, date: new Date().toISOString() });
    await writeJson(filePath, scores);
    res.status(201).json({ ok: true });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}
