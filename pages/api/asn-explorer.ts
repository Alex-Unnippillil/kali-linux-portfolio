import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { asn } = req.query;
  if (typeof asn !== 'string') {
    res.status(400).json({ error: 'asn query parameter required' });
    return;
  }
  const cleaned = asn.replace(/^AS/i, '');
  if (!/^\d+$/.test(cleaned)) {
    res.status(400).json({ error: 'invalid ASN' });
    return;
  }

  try {
    const urlBase = 'https://stat.ripe.net/data';
    const [overviewRes, prefixesRes, neighboursRes] = await Promise.all([
      fetch(`${urlBase}/as-overview/data.json?resource=AS${cleaned}`),
      fetch(`${urlBase}/announced-prefixes/data.json?resource=AS${cleaned}`),
      fetch(`${urlBase}/asn-neighbours/data.json?resource=AS${cleaned}`),
    ]);

    if (!overviewRes.ok || !prefixesRes.ok || !neighboursRes.ok) {
      res
        .status(502)
        .json({ error: 'Failed to fetch data from RIPE' });
      return;
    }

    const overview = await overviewRes.json();
    const prefixesData = await prefixesRes.json();
    const neighboursData = await neighboursRes.json();

    const holder = overview?.data?.holder || null;
    const prefixes = Array.isArray(prefixesData?.data?.prefixes)
      ? prefixesData.data.prefixes.map((p: any) => p.prefix)
      : [];
    const peers = Array.isArray(neighboursData?.data?.neighbours)
      ? Array.from(
          new Set(neighboursData.data.neighbours.map((n: any) => n.asn))
        )
      : [];

    res.status(200).json({ holder, prefixes, peers });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

