import type { NextApiRequest, NextApiResponse } from 'next';
import {
  UserInputError,
  UpstreamError,
  withErrorHandler,
} from '../../lib/errors';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

interface RobotsResponse {
  disallows: string[];
  sitemapEntries: SitemapEntry[];
  missingRobots?: boolean;
}

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RobotsResponse>
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    throw new UserInputError('Missing url query parameter');
  }

  // Intentionally trigger a fault so the ErrorPane can be exercised
  throw new UpstreamError('Deliberate failure for testing');

  // Real implementation would go here
});

