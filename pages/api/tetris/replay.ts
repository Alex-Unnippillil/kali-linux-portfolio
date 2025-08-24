import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { readJson, writeJson } from '../../../lib/store';

const file = path.join(process.cwd(), 'data', 'tetris-replays.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const body = req.body;
    const arr = await readJson(file, [] as any[]);
    arr.push({ ...body, time: Date.now() });
    await writeJson(file, arr);
    res.status(200).json({ ok: true });
  } else {
    res.status(405).end();
  }
}
