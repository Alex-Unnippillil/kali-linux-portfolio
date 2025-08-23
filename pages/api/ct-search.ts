import type { NextApiRequest, NextApiResponse } from 'next';

type CtResult = {
  subdomain: string;
  first_seen: string;
  issuer: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain } = req.query;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing domain' });
  }

  try {
    const endpoint = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: 'Upstream server error' });
    }
    const data = await response.json();
    const seen = new Set<string>();
    const results: CtResult[] = [];
    for (const item of data) {
      const sub = item.name_value as string;
      if (!seen.has(sub)) {
        seen.add(sub);
        results.push({
          subdomain: sub,
          first_seen: item.entry_timestamp,
          issuer: item.issuer_name,
        });
      }
    }
    return res.status(200).json(results);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}
