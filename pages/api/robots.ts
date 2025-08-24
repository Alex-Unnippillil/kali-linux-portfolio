import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate';
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

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
};

const querySchema = z.object({ url: z.string().url() });
const bodySchema = z.object({});

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RobotsResponse>
) {
  const parsed = validateRequest(req, res, {
    querySchema,
    bodySchema,
    queryLimit: 1024,
    bodyLimit: 1024,
  });
  if (!parsed) return;
  const { url } = parsed.query as { url: string };

  if (!url || typeof url !== 'string') {
    throw new UserInputError('Missing url query parameter');
  }

  // Intentionally trigger a fault so the ErrorPane can be exercised
  throw new UpstreamError('Deliberate failure for testing');

  // Real implementation would go here
});

