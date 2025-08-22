import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const dir = path.join(process.cwd(), 'apps', 'breakout', 'levels');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `level-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(req.body));
    res.status(200).json({ saved: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save' });
  }
}
