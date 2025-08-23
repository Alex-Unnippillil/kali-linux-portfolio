import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ip } = req.query;
  if (typeof ip !== 'string') {
    res.status(400).json({ error: 'ip parameter required' });
    return;
  }
  try {
    const response = await fetch('https://check.torproject.org/torbulkexitlist');
    if (!response.ok) {
      throw new Error('Failed to fetch exit list');
    }
    const text = await response.text();
    const ips = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const isExit = ips.includes(ip);
    const fetchedAt =
      response.headers.get('last-modified') || new Date().toISOString();
    res.status(200).json({ ip, isExit, fetchedAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Lookup failed' });
  }
}
