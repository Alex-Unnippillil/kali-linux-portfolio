import type { NextApiRequest, NextApiResponse } from 'next';
import { enqueue } from '../../../lib/waitlist';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  const { email, consent } = req.body || {};
  if (!email || typeof email !== 'string' || !consent) {
    res.status(400).json({ ok: false });
    return;
  }
  const entry = enqueue(email.trim().toLowerCase());
  const confirmUrl = `/api/waitlist/confirm?token=${entry.token}`;
  console.log('waitlist confirmation:', confirmUrl);
  res.status(200).json({ ok: true });
}
