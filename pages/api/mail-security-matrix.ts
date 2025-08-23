import type { NextApiRequest, NextApiResponse } from 'next';

async function lookup(name: string, type: string) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('DNS query failed');
  return res.json();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { domain } = req.query;
  if (typeof domain !== 'string') {
    res.status(400).json({ error: 'domain parameter required' });
    return;
  }
  try {
    const [caa, mx, mtaSts] = await Promise.all([
      lookup(domain, 'CAA'),
      lookup(domain, 'MX'),
      lookup(`_mta-sts.${domain}`, 'TXT'),
    ]);
    res.status(200).json({ caa, mx, mtaSts });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Lookup failed' });
  }
}
