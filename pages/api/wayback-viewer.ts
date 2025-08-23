import type { NextApiRequest, NextApiResponse } from 'next';

interface Snapshot {
  timestamp: string;
  original: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url' });
    return;
  }

  try {
    const availabilityRes = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
    );
    const availability = await availabilityRes.json();

    const listRes = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
        url,
      )}&output=json&fl=timestamp,original`,
    );
    const listJson = await listRes.json();
    const snapshots: Snapshot[] = Array.isArray(listJson)
      ? listJson.slice(1).map((row: [string, string]) => ({
          timestamp: row[0],
          original: row[1],
        }))
      : [];

    res.status(200).json({ availability, snapshots });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error fetching data' });
  }
}
