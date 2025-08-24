import type { NextApiRequest, NextApiResponse } from 'next';
import madge from 'madge';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const root = process.cwd();
  const include = ['components', 'pages', 'lib', 'apps'];
  const src = include.map((d) => path.join(root, d));

  try {
    const result = await madge(src, {
      baseDir: root,
      fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
      includeNpm: false,
    });

    const graph = result.obj();
    const circular = result.circular();
    const orphans = result.orphans();

    const sizes: Record<string, number> = {};
    await Promise.all(
      Object.keys(graph).map(async (file) => {
        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          const stat = await fs.stat(path.join(root, file));
          sizes[file] = stat.size;
        } catch {
          sizes[file] = 0;
        }
      }),
    );

    res.status(200).json({ graph, circular, orphans, sizes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
