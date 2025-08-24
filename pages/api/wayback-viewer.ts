import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface Snapshot {
  timestamp: string;
  original: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { url, page = '0', limit = '50' } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url' });
    return;
  }

  const pageNum = Array.isArray(page) ? parseInt(page[0], 10) : parseInt(page, 10);
  const limitNum = Array.isArray(limit) ? parseInt(limit[0], 10) : parseInt(limit, 10);

  try {
    const availabilityRes = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
    );
    const availability = await availabilityRes.json();

    const listRes = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
        url,
      )}&output=json&fl=timestamp,original&page=${Number.isNaN(pageNum) ? 0 : pageNum}&limit=${
        Number.isNaN(limitNum) ? 50 : limitNum
      }`,
    );
    if (!listRes.ok) {
      throw new Error('Failed to fetch snapshots');
    }
    const listJson = await listRes.json();
    const rows = Array.isArray(listJson) ? listJson.slice(1) : [];
    const snapshots: Snapshot[] = rows.map((row: [string, string]) => ({
      timestamp: row[0],
      original: row[1],
    }));
    const hasMore = rows.length === (Number.isNaN(limitNum) ? 50 : limitNum);

    res.status(200).json({ availability, snapshots, hasMore });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error fetching data' });
  }
}
