import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const dir = path.join(process.cwd(), 'apps', 'breakout', 'levels');
  fs.mkdirSync(dir, { recursive: true });

  if (req.method === 'GET') {
    try {
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'));
      const levels = files.map((f) => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
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
    try {
      const file = path.join(dir, `level-${Date.now()}.json`);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(file, JSON.stringify(req.body));
      res.status(200).json({ saved: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
