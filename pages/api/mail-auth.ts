import type { NextApiRequest, NextApiResponse } from 'next';

type CacheEntry = {
  data: string[];
  expires: number;
  promise?: Promise<string[]>;
};

const TXT_CACHE: Record<string, CacheEntry> = {};
const TXT_TTL = 5 * 60 * 1000; // 5 minutes

async function lookupTxt(name: string): Promise<string[]> {
  const now = Date.now();
  const cached = TXT_CACHE[name];
  if (cached) {
    if (cached.data.length && cached.expires > now) return cached.data;
    if (cached.promise) return cached.promise;
  }

  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`;
  const promise = fetch(url, { headers: { Accept: 'application/dns-json' } })
    .then((res) => {
      if (!res.ok) throw new Error('DNS query failed');
      return res.json();
    })
    .then((data) => {
      const answers = data.Answer || [];
      const records = answers.map((a: any) =>
        String(a.data)
          .replace(/^"|"$/g, '')
          .replace(/"\s"/g, '')
      );
      TXT_CACHE[name] = { data: records, expires: now + TXT_TTL };
      return records;
    })
    .catch((err) => {
      delete TXT_CACHE[name];
      throw err;
    });

  TXT_CACHE[name] = { data: [], expires: 0, promise };
  return promise;
}

const SPF_SPEC = 'https://datatracker.ietf.org/doc/html/rfc7208';

function parseSpf(records: string[]) {
  const spfRecords = records.filter((r) => r.toLowerCase().startsWith('v=spf1'));
  if (spfRecords.length === 0) {
    return {
      pass: false,
      message: 'No SPF record found',
      recommendation:
        'Add a TXT record starting with v=spf1 and ending with -all or ~all',
      example: 'v=spf1 mx -all',
      spec: SPF_SPEC,
    };
  }
  if (spfRecords.length > 1) {
    return {
      pass: false,
      record: spfRecords.join(' | '),
      message: 'Multiple SPF records found',
      recommendation: 'Consolidate into a single SPF record',
      example: 'v=spf1 a mx -all',
      spec: SPF_SPEC,
    };
  }
  const record = spfRecords[0];
  const policy = record.match(/\s([+-]?all)/)?.[1] || '';
  let recommendation = '';
  if (policy === '~all') {
    recommendation = 'Consider using -all for strict enforcement';
  } else if (policy !== '-all') {
    recommendation = 'SPF record should end with -all or ~all';
  }
  const pass = policy === '-all' || policy === '~all';
  return {
    pass,
    record,
    policy,
    recommendation,
    example: pass ? undefined : 'v=spf1 mx -all',
    spec: SPF_SPEC,
  };
}

const DKIM_SPEC = 'https://datatracker.ietf.org/doc/html/rfc6376';

function parseDkim(records: string[]) {
  const record = records.find((r) => r.toLowerCase().includes('v=dkim1'));
  if (!record) {
    return {
      pass: false,
      message: 'No DKIM record found for selector',
      recommendation: 'Ensure the selector is correct and DKIM is configured',
      example: 'v=DKIM1; k=rsa; p=base64publickey',
      spec: DKIM_SPEC,
    };
  }
  if (!record.includes('p=')) {
    return {
      pass: false,
      record,
      message: 'DKIM record missing p= public key',
      recommendation: 'Include the p= tag with your public key',
      example: 'v=DKIM1; k=rsa; p=base64publickey',
      spec: DKIM_SPEC,
    };
  }
  return { pass: true, record, spec: DKIM_SPEC };
}

const DMARC_SPEC = 'https://datatracker.ietf.org/doc/html/rfc7489';

function parseDmarc(records: string[]) {
  const dmarcRecords = records.filter((r) => r.toLowerCase().startsWith('v=dmarc1'));
  if (dmarcRecords.length === 0) {
    return {
      pass: false,
      message: 'No DMARC record found',
      recommendation: 'Add a TXT record at _dmarc with v=DMARC1 and a p= policy',
      example: 'v=DMARC1; p=reject; rua=mailto:postmaster@domain.com',
      spec: DMARC_SPEC,
    };
  }
  if (dmarcRecords.length > 1) {
    return {
      pass: false,
      record: dmarcRecords.join(' | '),
      message: 'Multiple DMARC records found',
      recommendation: 'Only one DMARC record should exist',
      example: 'v=DMARC1; p=reject; adkim=s; aspf=s',
      spec: DMARC_SPEC,
    };
  }
  const record = dmarcRecords[0];
  const policy = record.match(/p=([^;]+)/)?.[1];
  const aspf = record.match(/aspf=([rs])/i)?.[1] || 'r';
  const adkim = record.match(/adkim=([rs])/i)?.[1] || 'r';
  let recommendation = '';
  let message: string | undefined;
  let pass = true;
  if (!policy) {
    pass = false;
    message = 'DMARC record missing p= policy';
    recommendation = 'Specify a p= policy such as quarantine or reject';
  } else if (!['none', 'quarantine', 'reject'].includes(policy)) {
    pass = false;
    message = 'Invalid DMARC policy';
    recommendation = 'Valid policies are none, quarantine, or reject';
  } else if (policy === 'none') {
    recommendation = 'Consider setting policy to quarantine or reject';
  }
  return {
    pass,
    record,
    policy,
    aspf,
    adkim,
    message,
    recommendation,
    example: pass ? undefined : 'v=DMARC1; p=reject; rua=mailto:postmaster@domain.com',
    spec: DMARC_SPEC,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { domain, selector } = req.query;
  if (typeof domain !== 'string') {
    res.status(400).json({ error: 'domain parameter required' });
    return;
  }
  try {
    const spfRecords = await lookupTxt(domain);
    const dmarcRecords = await lookupTxt(`_dmarc.${domain}`);
    let dkimRecords: string[] = [];
    if (typeof selector === 'string' && selector) {
      dkimRecords = await lookupTxt(`${selector}._domainkey.${domain}`);
    }
    res.status(200).json({
      spf: parseSpf(spfRecords),
      dkim: selector
        ? parseDkim(dkimRecords)
        : {
            pass: false,
            message: 'No selector provided',
            recommendation: 'Provide a DKIM selector to check the record',
            spec: DKIM_SPEC,
          },
      dmarc: parseDmarc(dmarcRecords),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Lookup failed' });
  }
}
