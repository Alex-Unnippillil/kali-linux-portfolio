import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate-server';
import { rateLimit } from '../../lib/rateLimiter';
import { setupUrlGuard } from '../../lib/urlGuard';

/**
 * DNS lookup using Google's resolver.
 * Rate limited to 60 requests per minute.
 */
setupUrlGuard();

const ALLOWED_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'NS'];

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
};

const querySchema = z.object({
  domain: z.string().min(1),
  type: z
    .string()
    .optional()
    .refine(
      (val) => !val || ALLOWED_TYPES.includes(val.toUpperCase()),
      'Invalid record type'
    ),
});
const bodySchema = z.object({});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await rateLimit(req, res))) return;

  const parsed = validateRequest(req, res, {
    querySchema,
    bodySchema,
    queryLimit: 1024,
    bodyLimit: 1024,
  });
  if (!parsed) return;
  const { domain, type } = parsed.query as { domain: string; type?: string };

  const recordType = type ? type.toUpperCase() : 'A';

  try {
    const endpoint = `https://dns.google/resolve?name=${encodeURIComponent(
      domain
    )}&type=${recordType}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: 'Upstream server error' });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e: unknown) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Request failed',
    });
  }
}

