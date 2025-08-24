import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

let tldCache: Set<string> | null = null;

async function getTlds() {
  if (tldCache) return tldCache;
  try {
    const resp = await fetch('https://data.iana.org/rdap/dns.json');
    const data = await resp.json();
    tldCache = new Set(
      data.services.flatMap((service: [string[], string[]]) =>
        service[0].map((tld) => tld.toLowerCase())
      )
    );
  } catch {
    tldCache = new Set();
  }
  return tldCache;
}

function normalizeRdap(data: any) {
  return {
    objectClassName: data.objectClassName,
    handle: data.handle,
    ldhName: data.ldhName,
    unicodeName: data.unicodeName,
    status: data.status,
    events: data.events?.map(({ eventAction, eventDate }: any) => ({ eventAction, eventDate })),
    nameservers: data.nameservers?.map(({ ldhName, status }: any) => ({ ldhName, status })),
    entities: data.entities?.map(({ handle, roles, vcardArray }: any) => ({ handle, roles, vcardArray })),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { domain } = req.query;
  if (typeof domain !== 'string') {
    res.status(400).json({ error: 'domain query parameter required' });
    return;
  }

  const tld = domain.split('.').pop()?.toLowerCase();
  const tlds = await getTlds();
  if (!tld || !tlds.has(tld)) {
    res.status(400).json({ error: 'Unsupported TLD' });
    return;
  }

  try {
    const response = await fetch(`https://rdap.org/domain/${domain}`);
    if (response.status === 429) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }
    if (!response.ok) {
      res.status(response.status).json({ error: 'RDAP lookup failed' });
      return;
    }
    const json = await response.json();
    res.status(200).json(normalizeRdap(json));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

