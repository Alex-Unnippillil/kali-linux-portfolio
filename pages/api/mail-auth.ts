import type { NextApiRequest, NextApiResponse } from 'next';

async function lookupTxt(name: string): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`;
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });
  if (!res.ok) throw new Error('DNS query failed');
  const data = await res.json();
  const answers = data.Answer || [];
  return answers.map((a: any) =>
    String(a.data)
      .replace(/^"|"$/g, '')
      .replace(/"\s"/g, '')
  );
}

function parseSpf(records: string[]) {
  const record = records.find((r) => r.startsWith('v=spf1'));
  if (!record) {
    return {
      pass: false,
      message: 'No SPF record found',
      recommendation: 'Add a TXT record starting with v=spf1 and ending with -all or ~all',
    };
  }
  const policy = record.match(/\s([~-]?all)/)?.[1] || '';
  let recommendation = '';
  if (policy === '~all') {
    recommendation = 'Consider using -all for strict enforcement';
  } else if (policy !== '-all') {
    recommendation = 'SPF record should end with -all or ~all';
  }
  return { pass: policy === '-all' || policy === '~all', record, recommendation };
}

function parseDkim(records: string[]) {
  const record = records.find((r) => r.includes('v=DKIM1'));
  if (!record) {
    return {
      pass: false,
      message: 'No DKIM record found for selector',
      recommendation: 'Ensure the selector is correct and DKIM is configured',
    };
  }
  if (!record.includes('p=')) {
    return { pass: false, record, recommendation: 'DKIM record missing p= public key' };
  }
  return { pass: true, record };
}

function parseDmarc(records: string[]) {
  const record = records.find((r) => r.startsWith('v=DMARC1'));
  if (!record) {
    return {
      pass: false,
      message: 'No DMARC record found',
      recommendation: 'Add a TXT record at _dmarc with v=DMARC1 and a p= policy',
    };
  }
  const policy = record.match(/p=([^;]+)/)?.[1];
  let recommendation = '';
  if (!policy) {
    recommendation = 'DMARC record missing p= policy';
  } else if (policy === 'none') {
    recommendation = 'Consider setting policy to quarantine or reject';
  }
  return { pass: !!policy, record, recommendation };
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
      dkim: selector ? parseDkim(dkimRecords) : {
        pass: false,
        message: 'No selector provided',
        recommendation: 'Provide a DKIM selector to check the record',
      },
      dmarc: parseDmarc(dmarcRecords),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Lookup failed' });
  }
}
