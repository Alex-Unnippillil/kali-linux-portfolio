import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<{ error: string }>,
) {
  res.status(501).json({ error: 'Not implemented' });
}

