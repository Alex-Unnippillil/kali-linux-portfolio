import type { NextApiRequest, NextApiResponse } from 'next';

async function readBody(req: NextApiRequest): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    const rawBody = await readBody(req);
    if (!rawBody) {
      res.status(204).end();
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = rawBody;
    }

    const report =
      typeof payload === 'object' && payload !== null && 'csp-report' in payload
        ? (payload as Record<string, unknown>)['csp-report']
        : payload;

    const meta = {
      report,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] ?? req.headers['referrer'],
    };

    console.warn('CSP violation reported', meta);
  } catch (error) {
    console.error('Failed to record CSP report', error);
  }

  res.status(204).end();
}
