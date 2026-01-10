import type { NextApiRequest, NextApiResponse } from 'next';
import { exportCsv } from '../../../lib/waitlist';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }
  const key = req.query.key;
  if (process.env.QUEUE_EXPORT_KEY && key !== process.env.QUEUE_EXPORT_KEY) {
    res.status(403).json({ ok: false });
    return;
  }
  const csv = exportCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"');
  res.status(200).send(csv);
}
