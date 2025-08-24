import type { NextApiRequest, NextApiResponse } from 'next';
import type { Dirent } from 'fs';
import path from 'path';
import { setupUrlGuard } from '../../lib/urlGuard';
import { readDir, readFile } from '../../lib/store';

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
    let entries: Dirent[];
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      entries = (await readDir(dir, { withFileTypes: true })) as Dirent[];
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
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          files[rel] = (await readFile(full)) ?? '';
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

