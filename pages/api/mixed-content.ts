import type { NextApiRequest, NextApiResponse } from 'next';

// Simple in-memory rate limiter
const RATE_LIMIT = 5; // requests
const WINDOW_MS = 60_000; // 1 minute
const requests = new Map<string, { count: number; start: number }>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch (e) {
    res.status(400).json({ error: 'Invalid url' });
    return;
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    res.status(400).json({ error: 'Unsupported protocol' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  const now = Date.now();
  const entry = requests.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    requests.set(ip, { count: 1, start: now });
  } else if (entry.count >= RATE_LIMIT) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  } else {
    entry.count += 1;
  }

  try {
    const response = await fetch(target.toString());
    const body = await response.text();
    res.status(200).json({ status: response.status, body });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

