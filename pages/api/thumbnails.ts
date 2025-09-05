import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

function getThumbDir() {
  const cacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(cacheHome, 'thumbnails');
}

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += await dirSize(full);
      } else {
        const stat = await fs.stat(full);
        total += stat.size;
      }
    }
  } catch {
    return 0;
  }
  return total;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const dir = getThumbDir();
  if (req.method === 'GET') {
    const size = await dirSize(dir);
    res.status(200).json({ size });
  } else if (req.method === 'DELETE') {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(dir, { recursive: true });
      res.status(200).json({ size: 0 });
    } catch (err) {
      res.status(500).json({ error: 'Failed to clear thumbnails' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    res.status(405).end('Method Not Allowed');
  }
}

