import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const q = req.query.path ?? '';
  const relativePath = Array.isArray(q) ? q.join('/') : q;
  const base = process.cwd();
  const target = path.resolve(base, relativePath);

  if (!target.startsWith(base)) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }

  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      const names = await fs.readdir(target);
      const items = await Promise.all(
        names.map(async (name) => {
          const s = await fs.stat(path.join(target, name));
          return { name, type: s.isDirectory() ? 'dir' : 'file' } as const;
        })
      );
      res.status(200).json({ path: relativePath, items });
    } else {
      const content = await fs.readFile(target, 'utf8');
      res.status(200).json({ path: relativePath, content });
    }
  } catch (err) {
    res.status(404).json({ error: 'Not found' });
  }
}
