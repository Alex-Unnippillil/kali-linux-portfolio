import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const { name, email, message, honeypot } = req.body || {};
  if (honeypot || !/\S+@\S+\.\S+/.test(email || '')) {
    res.status(400).json({ ok: false });
    return;
  }

  console.log('contact message', { name, email, message });
  res.status(200).json({ ok: true });
}
