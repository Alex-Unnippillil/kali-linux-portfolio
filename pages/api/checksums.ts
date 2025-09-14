import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchAndSignChecksums } from '../../lib/checksums';

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { checksums, signature } = await fetchAndSignChecksums();
    res.status(200).json({ checksums, signature });
  } catch (err) {
    console.error('checksum API error', err);
    res.status(500).json({ error: 'Unable to load checksums' });
  }
}
