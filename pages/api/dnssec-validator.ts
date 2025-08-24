import type { NextApiRequest, NextApiResponse } from 'next';
import { rateLimit } from '../../lib/rateLimiter';
import { setupUrlGuard } from '../../lib/urlGuard';

/**
 * DNSSEC validation using Google's resolver.
 * Rate limited to 60 requests per minute.
 */
setupUrlGuard();

const ALLOWED_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SOA', 'DNSKEY', 'DS', 'CAA'];

const STATUS_CODES: Record<number, string> = {
  0: 'NOERROR',
  1: 'FORMERR',
  2: 'SERVFAIL',
  3: 'NXDOMAIN',
  4: 'NOTIMP',
  5: 'REFUSED',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await rateLimit(req, res))) return;

  const { domain, type } = req.query;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing domain' });
  }
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Missing type' });
  }

  const recordType = type.toUpperCase();
  if (!ALLOWED_TYPES.includes(recordType)) {
    return res.status(400).json({ error: 'Invalid record type' });
  }

  try {
    const endpoint = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${recordType}&cd=0`;
    const response = await fetch(endpoint);
    const data = await response.json();
    const statusText = STATUS_CODES[data.Status] || String(data.Status);
    return res.status(200).json({
      ok: response.ok,
      ad: data.AD ?? 0,
      cd: data.CD ?? 0,
      status: statusText,
    });
  } catch (e: unknown) {
    let errorMessage = 'Request failed';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    return res.status(500).json({ ok: false, error: errorMessage });
  }
}

