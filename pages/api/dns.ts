import type { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'NS'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, type } = req.query;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing domain' });
  }

  const recordType =
    typeof type === 'string' ? type.toUpperCase() : 'A';

  if (!ALLOWED_TYPES.includes(recordType)) {
    return res.status(400).json({ error: 'Invalid record type' });
  }

  try {
    const endpoint = `https://dns.google/resolve?name=${encodeURIComponent(
      domain
    )}&type=${recordType}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: 'Upstream server error' });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}

