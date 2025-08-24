import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  const root = process.cwd();
  const include = ['components', 'pages', 'lib', 'apps'];
  const exts = new Set(['.js', '.jsx', '.ts', '.tsx']);
  const ignore = new Set(['node_modules', '.next', '.git', 'public']);

  const files: Record<string, string> = {};

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (exts.has(path.extname(entry.name))) {
        try {
          const rel = path.relative(root, full).replace(/\\/g, '/');
          files[rel] = await fs.readFile(full, 'utf8');
        } catch {
          // ignore unreadable files
        }
      }
    }
  }

  for (const d of include) {
    await walk(path.join(root, d));
  }

  res.status(200).json({ files });
}

