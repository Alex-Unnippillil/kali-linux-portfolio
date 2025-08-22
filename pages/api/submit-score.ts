import type { NextApiRequest, NextApiResponse } from 'next';

// Simple in-memory rate limiting per IP
const hits: Record<string, { count: number; time: number }> = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
  const now = Date.now();
  const entry = hits[ip] || { count: 0, time: now };

  if (now - entry.time < 60_000 && entry.count >= 5) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (now - entry.time > 60_000) {
    entry.count = 0;
    entry.time = now;
  }

  entry.count += 1;
  hits[ip] = entry;

  // Disable caching for write operations
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ ok: true });
}
