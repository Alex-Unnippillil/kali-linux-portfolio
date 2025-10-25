import type { NextApiRequest, NextApiResponse } from 'next';
import { confirm } from '../../../lib/waitlist';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }
  const { token } = req.query;
  if (typeof token !== 'string') {
    res.status(400).json({ ok: false });
    return;
  }
  const ok = confirm(token);
  res.status(ok ? 200 : 400).json({ ok });
}
