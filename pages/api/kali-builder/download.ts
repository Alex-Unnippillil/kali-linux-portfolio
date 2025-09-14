import type { NextApiRequest, NextApiResponse } from 'next';
import { getJob, getDownloadUrl } from '../../../lib/kaliBuilder';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'id required' });
  }

  const job = await getJob(id);
  if (!job || job.status !== 'completed' || !job.artifactKey) {
    return res.status(404).json({ error: 'job not ready' });
  }

  try {
    const url = await getDownloadUrl(job.artifactKey);
    res.status(200).json({ url });
  } catch (err) {
    res.status(500).json({ error: 'failed to generate url' });
  }
}
