import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const mapsDir = path.join(process.cwd(), 'public', 'tower-defense-maps');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const data = req.body;
    if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });
    const file = path.join(mapsDir, `${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    res.status(200).json({ saved: true });
  } else {
    res.status(405).end();
  }
}
