import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { z } from 'zod';
import { validateRequest } from '../../../lib/validate';
import { readDir, readJson, writeJson } from '../../../lib/store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dir = path.join(process.cwd(), 'apps', 'breakout', 'levels');

  if (req.method === 'GET') {
    try {
      const files = (await readDir(dir)).filter((f) => f.endsWith('.json'));
      const levels = await Promise.all(
        files.map((f) => readJson(path.join(dir, f), [])),
      );
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
      await writeJson(file, req.body);
      res.status(200).json({ saved: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
