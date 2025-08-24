import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

type DnsResponse = { Answer?: { data: string }[]; [key: string]: any };

// simple in-memory cache for DNS lookups
const cache = new Map<string, { timestamp: number; data: any }>();
const TTL = 1000 * 60 * 5; // 5 minutes

async function lookup(name: string, type: string): Promise<DnsResponse> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DNS query failed for ${name}`);
  }
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

  const cached = cache.get(domain);
  const now = Date.now();
  if (cached && now - cached.timestamp < TTL) {
    res.status(200).json(cached.data);
    return;
  }

  const errors: Record<string, string> = {};
  let mx: DnsResponse | undefined;
  let mtaSts: DnsResponse | undefined;
  let tlsRpt: DnsResponse | undefined;
  const dane: Record<string, DnsResponse | { error: string }> = {};

  try {
    mx = await lookup(domain, 'MX');
    if (!mx.Answer) {
      errors.mx = 'No MX records found';
    }
  } catch (e: any) {
    errors.mx = e.message || 'MX lookup failed';
  }

  try {
    mtaSts = await lookup(`_mta-sts.${domain}`, 'TXT');
    if (!mtaSts.Answer) {
      errors.mtaSts = 'No MTA-STS record found';
    }
  } catch (e: any) {
    errors.mtaSts = e.message || 'MTA-STS lookup failed';
  }

  try {
    tlsRpt = await lookup(`_smtp._tls.${domain}`, 'TXT');
    if (!tlsRpt.Answer) {
      errors.tlsRpt = 'No TLS-RPT record found';
    }
  } catch (e: any) {
    errors.tlsRpt = e.message || 'TLS-RPT lookup failed';
  }

  if (mx?.Answer) {
    await Promise.all(
      mx.Answer.map(async (a: any) => {
        const host = String(a.data).split(' ').pop()?.replace(/\.$/, '');
        if (!host) return;
        try {
          const tlsa = await lookup(`_25._tcp.${host}`, 'TLSA');
          if (!tlsa.Answer) {
            dane[host] = { error: 'No TLSA record found' };
          } else {
            dane[host] = tlsa;
          }
        } catch (e: any) {
          dane[host] = { error: e.message || 'TLSA lookup failed' };
        }
      })
    );
  } else if (!errors.mx) {
    errors.dane = 'No MX hosts available for TLSA lookup';
  }

  const result = { mx, mtaSts, tlsRpt, dane, errors };
  cache.set(domain, { timestamp: now, data: result });
  res.status(200).json(result);
}
