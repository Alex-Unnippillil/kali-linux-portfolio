import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const file = path.join(process.cwd(), 'data', 'tetris-stats.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const body = req.body;
    let arr: any[] = [];
    try {
      arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      arr = [];
    }
    arr.push({ ...body, time: Date.now() });
    fs.writeFileSync(file, JSON.stringify(arr, null, 2));
    res.status(200).json({ ok: true });
  } else {
    res.status(405).end();
  }
}
