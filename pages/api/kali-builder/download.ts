import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }

  const job = Array.isArray(req.query.job) ? req.query.job[0] : req.query.job;
  if (!job) {
    res.status(400).json({ ok: false, code: 'invalid_job' });
    return;
  }

  const api = process.env.KALI_BUILDER_API_URL;
  const bucket = process.env.KALI_BUILDER_BUCKET;
  if (!api || !bucket) {
    res.status(503).json({ ok: false, code: 'builder_disabled' });
    return;
  }

  try {
    const r = await fetch(`${api}/jobs/${job}`);
    if (!r.ok) {
      res.status(404).json({ ok: false, code: 'not_found' });
      return;
    }
    const data = await r.json();
    if (data.status !== 'complete' || !data.key) {
      res.status(202).json({ ok: true, status: data.status });
      return;
    }

    const command = new GetObjectCommand({ Bucket: bucket, Key: data.key });
    const url = await getSignedUrl(client, command, { expiresIn: 60 });
    res.status(200).json({ ok: true, url });
  } catch {
    res.status(500).json({ ok: false });
  }
}
