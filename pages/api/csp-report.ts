import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readBody(req: NextApiRequest): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }

  try {
    const raw = await readBody(req);
    if (raw) {
      const parsed = JSON.parse(raw);
      const report = parsed['csp-report'] ?? parsed.report ?? parsed;
      console.warn('CSP violation', {
        path: req.url,
        report,
      });
    }
  } catch (error) {
    console.error('Failed to parse CSP report', error);
  }

  res.status(204).end();
}
