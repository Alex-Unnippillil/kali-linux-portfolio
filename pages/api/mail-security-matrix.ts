import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

type DnsResponse = { Answer?: { data: string }[]; [key: string]: any };

type CheckResult = {
  status: 'pass' | 'warn' | 'fail';
  record?: string;
  error?: string;
};

type ApiResponse = {
  spf: CheckResult;
  dkim: CheckResult;
  dmarc: CheckResult;
  mtaSts: CheckResult;
  tlsRpt: CheckResult;
  bimi: CheckResult;
};

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

  const extract = (r?: DnsResponse) =>
    r?.Answer?.map((a) => a.data.replace(/"/g, '') ?? '').filter(Boolean) ||
    [];

  const response: ApiResponse = {
    spf: { status: 'fail', error: 'lookup failed' },
    dkim: { status: 'fail', error: 'lookup failed' },
    dmarc: { status: 'fail', error: 'lookup failed' },
    mtaSts: { status: 'fail', error: 'lookup failed' },
    tlsRpt: { status: 'fail', error: 'lookup failed' },
    bimi: { status: 'fail', error: 'lookup failed' },
  };

  try {
    const spf = extract(await lookup(domain, 'TXT'));
    const record = spf.find((s) => s.toLowerCase().includes('v=spf1'));
    if (!record) {
      response.spf = { status: 'fail', error: 'No SPF record found' };
    } else if (record.includes('-all')) {
      response.spf = { status: 'pass', record };
    } else {
      response.spf = { status: 'warn', record };
    }
  } catch (e: any) {
    response.spf = { status: 'fail', error: e.message || 'SPF lookup failed' };
  }

  try {
    const dkim = extract(await lookup(`default._domainkey.${domain}`, 'TXT'));
    const record = dkim.find((s) => s.toLowerCase().includes('v=dkim1'));
    if (!record) {
      response.dkim = { status: 'fail', error: 'No DKIM record found' };
    } else {
      response.dkim = { status: 'pass', record };
    }
  } catch (e: any) {
    response.dkim = {
      status: 'fail',
      error: e.message || 'DKIM lookup failed',
    };
  }

  try {
    const dmarc = extract(await lookup(`_dmarc.${domain}`, 'TXT'));
    const record = dmarc.find((s) => s.toLowerCase().includes('v=dmarc1'));
    if (!record) {
      response.dmarc = { status: 'fail', error: 'No DMARC record found' };
    } else {
      const policyMatch = record.match(/p=([a-zA-Z]+)/);
      const policy = policyMatch?.[1]?.toLowerCase();
      if (policy === 'reject' || policy === 'quarantine') {
        response.dmarc = { status: 'pass', record };
      } else {
        response.dmarc = { status: 'warn', record };
      }
    }
  } catch (e: any) {
    response.dmarc = {
      status: 'fail',
      error: e.message || 'DMARC lookup failed',
    };
  }

  try {
    const mtaSts = extract(await lookup(`_mta-sts.${domain}`, 'TXT'));
    const record = mtaSts.find((s) => s.toLowerCase().includes('v=stsv1'));
    if (!record) {
      response.mtaSts = { status: 'fail', error: 'No MTA-STS record found' };
    } else {
      response.mtaSts = { status: 'pass', record };
    }
  } catch (e: any) {
    response.mtaSts = {
      status: 'fail',
      error: e.message || 'MTA-STS lookup failed',
    };
  }

  try {
    const tlsRpt = extract(await lookup(`_smtp._tls.${domain}`, 'TXT'));
    const record = tlsRpt.find((s) => s.toLowerCase().includes('v=tlsrptv1'));
    if (!record) {
      response.tlsRpt = { status: 'fail', error: 'No TLS-RPT record found' };
    } else {
      response.tlsRpt = { status: 'pass', record };
    }
  } catch (e: any) {
    response.tlsRpt = {
      status: 'fail',
      error: e.message || 'TLS-RPT lookup failed',
    };
  }

  try {
    const bimi = extract(await lookup(`default._bimi.${domain}`, 'TXT'));
    const record = bimi.find((s) => s.toLowerCase().includes('v=bimi1'));
    if (!record) {
      response.bimi = { status: 'fail', error: 'No BIMI record found' };
    } else {
      response.bimi = { status: 'pass', record };
    }
  } catch (e: any) {
    response.bimi = {
      status: 'fail',
      error: e.message || 'BIMI lookup failed',
    };
  }

  cache.set(domain, { timestamp: now, data: response });
  res.status(200).json(response);
}
