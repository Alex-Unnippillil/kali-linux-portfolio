import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface Snapshot {
  timestamp: string;
  original: string;
  statuscode: string;
  mimetype: string;
  robotflags?: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { url, page = '0', limit = '50', status, mime, noRobot } = req.query;
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

    const filters: string[] = [];
    if (status && typeof status === 'string') filters.push(`statuscode:${status}`);
    if (mime && typeof mime === 'string') filters.push(`mimetype:${mime}`);
    if (noRobot === '1' || noRobot === 'true') filters.push('!robotflags:.*');
    const filterParam = filters.map((f) => `&filter=${encodeURIComponent(f)}`).join('');

    const listRes = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
        url,
      )}&output=json&fl=timestamp,original,statuscode,mimetype,robotflags${filterParam}&page=${
        Number.isNaN(pageNum) ? 0 : pageNum
      }&limit=${Number.isNaN(limitNum) ? 50 : limitNum}`,
    );
    if (!listRes.ok) {
      throw new Error('Failed to fetch snapshots');
    }
    const listJson = await listRes.json();
    const rawRows: any[] = Array.isArray(listJson) ? listJson.slice(1) : [];
    let rows = rawRows;
    if (status && typeof status === 'string') rows = rows.filter((r) => r[2] === status);
    if (mime && typeof mime === 'string') rows = rows.filter((r) => r[3] === mime);
    if (noRobot === '1' || noRobot === 'true') rows = rows.filter((r) => !r[4]);
    const snapshots: Snapshot[] = rows.map(
      (row: [string, string, string, string, string | null]) => ({
        timestamp: row[0],
        original: row[1],
        statuscode: row[2],
        mimetype: row[3],
        robotflags: row[4] ?? null,
      }),
    );
    const hasMore = rawRows.length === (Number.isNaN(limitNum) ? 50 : limitNum);

    res.status(200).json({ availability, snapshots, hasMore });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error fetching data' });
  }
}
