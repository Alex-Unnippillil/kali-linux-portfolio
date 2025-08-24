import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

let tldCache: Set<string> | null = null;

async function getTlds(): Promise<Set<string>> {
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

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}

interface RdapNameserver {
  ldhName: string;
  status?: string[];
}

interface RdapEntity {
  handle: string;
  roles: string[];
  vcardArray: unknown;
}

interface RdapDomain {
  objectClassName: string;
  handle: string;
  ldhName: string;
  unicodeName?: string;
  status?: string[];
  events?: RdapEvent[];
  nameservers?: RdapNameserver[];
  entities?: RdapEntity[];
}

function normalizeRdap(data: RdapDomain): RdapDomain {
  return {
    objectClassName: data.objectClassName,
    handle: data.handle,
    ldhName: data.ldhName,
    unicodeName: data.unicodeName,
    status: data.status,
    events: data.events?.map(({ eventAction, eventDate }) => ({ eventAction, eventDate })),
    nameservers: data.nameservers?.map(({ ldhName, status }) => ({ ldhName, status })),
    entities: data.entities?.map(({ handle, roles, vcardArray }) => ({ handle, roles, vcardArray })),
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
    const json: RdapDomain = await response.json();
    res.status(200).json(normalizeRdap(json));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

