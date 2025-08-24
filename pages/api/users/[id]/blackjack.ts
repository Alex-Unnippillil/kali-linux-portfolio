import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { getStats, setStats, type Stats } from '../../../../lib/user-store';

const BUCKET_CAPACITY = 5;
const REFILL_INTERVAL = 60_000; // 1 minute
const buckets = new Map<string, { tokens: number; last: number }>();

function allowRequest(id: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(id) || { tokens: BUCKET_CAPACITY, last: now };
  const elapsed = now - bucket.last;
  if (elapsed > 0) {
    const refill = Math.floor((elapsed / REFILL_INTERVAL) * BUCKET_CAPACITY);
    if (refill > 0) {
      bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + refill);
      bucket.last = now;
    }
  }
  if (bucket.tokens <= 0) {
    buckets.set(id, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(id, bucket);
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const token = req.headers.authorization?.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ error: 'Missing JWT secret' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret) as jwt.JwtPayload;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (payload.sub !== id) {
    return res.status(403).json({ error: 'Token subject mismatch' });
  }

  const userId = id as string;
  const userStats = await getStats(userId);

  if (req.method === 'GET') {
    return res.status(200).json(userStats);
  }

  if (req.method === 'POST') {
    if (!allowRequest(userId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    const { result, bankroll } = req.body;
    const stats: Stats = { ...userStats };
    if (result === 'win') stats.wins++;
    if (result === 'loss') stats.losses++;
    if (result === 'push') stats.pushes++;
    if (typeof bankroll === 'number') stats.bankroll = bankroll;
    await setStats(userId, stats);
    return res.status(200).json(stats);
  }

  return res.status(405).end();
}
