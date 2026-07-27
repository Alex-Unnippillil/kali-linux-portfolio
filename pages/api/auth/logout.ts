import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSessionCookie } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }

  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ ok: true });
}
