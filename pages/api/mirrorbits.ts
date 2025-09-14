import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';

type StatusRecord = { status: number; checkedAt: number };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const record = await kv.get<StatusRecord>('mirrorbits:status');
  if (!record) {
    res.status(503).json({ stale: true });
    return;
  }
  const stale = Date.now() - record.checkedAt > 30 * 60 * 1000;
  res.status(200).json({ ...record, stale });
}
