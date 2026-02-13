import type { NextApiRequest, NextApiResponse } from 'next';
import data from '../../data/cve-feed.json';
import type { CveFeed } from '../../types/cve';
import { CVE_CACHE_SECONDS, CVE_STALE_SECONDS } from '../../lib/cache/cve';

const cveFeed = data as CveFeed;

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<CveFeed | ErrorResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${CVE_CACHE_SECONDS}, stale-while-revalidate=${CVE_STALE_SECONDS}`,
  );

  return res.status(200).json(cveFeed);
}
