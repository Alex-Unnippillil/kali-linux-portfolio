import type { NextApiRequest, NextApiResponse } from 'next';
import { logEvent } from '../../lib/axiom';
import { maskPII } from '../../lib/analytics';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    const body = maskPII(req.body);
    await logEvent({ type: 'runtime-error', ...body });
  } catch {
    // ignore logging errors
  }

  res.status(200).json({ ok: true });
}
