import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'module-index.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const modules = JSON.parse(fileContents);
    res.status(200).json(modules);
  } catch {
    res.status(500).json({ error: 'Unable to load module index' });
  }
}
