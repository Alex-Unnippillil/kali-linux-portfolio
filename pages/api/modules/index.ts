import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { generateStrongEtag, ifNoneMatchIncludes } from '../../../utils/http/cache';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'module-index.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const modules = JSON.parse(fileContents);
    const body = JSON.stringify(modules);
    const etag = generateStrongEtag(body);

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('ETag', etag);

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatchIncludes(etag, ifNoneMatch)) {
      res.status(304).end();
      return;
    }

    res.status(200).json(modules);
  } catch {
    res.status(500).json({ error: 'Unable to load module index' });
  }
}
