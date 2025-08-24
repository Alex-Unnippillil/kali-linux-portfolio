export { default, displayPcreRe2Lab } from '../../components/apps/pcre-re2-lab';

import type { NextApiRequest, NextApiResponse } from 'next';
import RE2 from 're2';

/**
 * API handler that wraps the native RE2 engine. The handler streams
 * timing and step metrics using Server Sent Events so the client can
 * render progressive results and a heatmap overlay.
 */
export async function matchApi(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { pattern, text } = req.body || {};
  if (typeof pattern !== 'string' || typeof text !== 'string') {
    res.status(400).json({ error: 'pattern and text required' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ event: 'start' })}\n\n`);

  const start = process.hrtime.bigint();
  let matches: string[] | null = null;
  let error: string | undefined;
  try {
    const re = new RE2(pattern, 'g');
    matches = (re.match(text) as unknown as string[]) || null;
  } catch (e: any) {
    error = e.message;
  }
  const end = process.hrtime.bigint();
  const time = Number(end - start) / 1e6;

  // Simple step metric: assume linear to input length
  const steps = text.length;

  res.write(
    `data: ${JSON.stringify({ event: 'result', time, steps, matches, error })}\n\n`
  );
  res.end();
}

export const config = {
  api: {
    bodyParser: true,
  },
};

