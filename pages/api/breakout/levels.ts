import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { validateRequest } from '../../../lib/validate';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const dir = path.join(process.cwd(), 'apps', 'breakout', 'levels');
  fs.mkdirSync(dir, { recursive: true });

  if (req.method === 'GET') {
    try {
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'));
      const levels = files.map((f) => {
        const data = fs.readFileSync(path.join(dir, f), 'utf8');
        return JSON.parse(data);
      });
      res.status(200).json(levels);
    } catch (e) {
      res.status(500).json({ error: 'Failed to load' });
    }
    return;
  }

  if (req.method === 'POST') {
    const bodySchema = z.array(z.array(z.number()));
    const parsed = validateRequest(req, res, { bodySchema });
    if (!parsed) return;
    try {
      const file = path.join(dir, `level-${Date.now()}.json`);
      fs.writeFileSync(file, JSON.stringify(parsed.body));
      res.status(200).json({ saved: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
