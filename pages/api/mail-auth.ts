import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

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
  const key = record.match(/p=([^;]+)/)?.[1];
  if (!key) {
    return {
      pass: false,
      record,
      message: 'DKIM record missing p= public key',
      recommendation: 'Include the p= tag with your public key',
      example: 'v=DKIM1; k=rsa; p=base64publickey',
      spec: DKIM_SPEC,
    };
  }
  let bits = 0;
  try {
    bits = Buffer.from(key, 'base64').length * 8;
  } catch {
    return {
      pass: false,
      record,
      message: 'Invalid base64 in DKIM p= key',
      recommendation: 'Ensure the p= value is a valid base64-encoded key',
      spec: DKIM_SPEC,
    };
  }
  if (bits < 1024) {
    return {
      pass: false,
      record,
      message: `DKIM key too short (${bits} bits)`,
      recommendation: 'Use a key of at least 1024 bits',
      spec: DKIM_SPEC,
    };
  }
  return { pass: true, record, bits, spec: DKIM_SPEC };
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

const MTA_STS_SPEC = 'https://datatracker.ietf.org/doc/html/rfc8461';

function parseMtaSts(records: string[]) {
  const record = records.find((r) => r.toLowerCase().startsWith('v=stsv1'));
  if (!record) {
    return {
      pass: false,
      message: 'No MTA-STS record found',
      recommendation: 'Add TXT record at _mta-sts with v=STSv1; id=...',
      example: 'v=STSv1; id=20220101T000000Z',
      spec: MTA_STS_SPEC,
    };
  }
  if (!/id=/i.test(record)) {
    return {
      pass: false,
      record,
      message: 'MTA-STS record missing id=',
      recommendation: 'Include id= tag for policy versioning',
      example: 'v=STSv1; id=20220101T000000Z',
      spec: MTA_STS_SPEC,
    };
  }
  return { pass: true, record, spec: MTA_STS_SPEC };
}

const TLS_RPT_SPEC = 'https://datatracker.ietf.org/doc/html/rfc8460';

function parseTlsRpt(records: string[]) {
  const record = records.find((r) => r.toLowerCase().startsWith('v=tlsrptv1'));
  if (!record) {
    return {
      pass: false,
      message: 'No TLS-RPT record found',
      recommendation:
        'Add TXT record at _smtp._tls with v=TLSRPTv1; rua=mailto:postmaster@domain.com',
      example: 'v=TLSRPTv1; rua=mailto:postmaster@domain.com',
      spec: TLS_RPT_SPEC,
    };
  }
  if (!/rua=/i.test(record)) {
    return {
      pass: false,
      record,
      message: 'TLS-RPT record missing rua=',
      recommendation: 'Specify rua=mailto: address for reports',
      example: 'v=TLSRPTv1; rua=mailto:postmaster@domain.com',
      spec: TLS_RPT_SPEC,
    };
  }
  return { pass: true, record, spec: TLS_RPT_SPEC };
}

const BIMI_SPEC = 'https://datatracker.ietf.org/doc/html/draft-blank-ietf-bimi-02';

function parseBimi(records: string[]) {
  const record = records.find((r) => r.toLowerCase().startsWith('v=bimi1'));
  if (!record) {
    return {
      pass: false,
      message: 'No BIMI record found',
      recommendation:
        'Add TXT record at default._bimi with v=BIMI1; l=https://logo.svg; a=https://vmc.pem',
      example: 'v=BIMI1; l=https://example.com/logo.svg; a=https://example.com/vmc.pem',
      spec: BIMI_SPEC,
    };
  }
  if (!/l=/i.test(record)) {
    return {
      pass: false,
      record,
      message: 'BIMI record missing l= logo URL',
      recommendation: 'Specify l= URL to SVG logo',
      example: 'v=BIMI1; l=https://example.com/logo.svg; a=https://example.com/vmc.pem',
      spec: BIMI_SPEC,
    };
  }
  return { pass: true, record, spec: BIMI_SPEC };
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
    const dmarcRecords = await lookupTxt(`_dmarc.${domain}`);
    const mtaStsRecords = await lookupTxt(`_mta-sts.${domain}`);
    const tlsRptRecords = await lookupTxt(`_smtp._tls.${domain}`);
    const bimiRecords = await lookupTxt(`default._bimi.${domain}`);
    let dkimRecords: string[] = [];
    if (typeof selector === 'string' && selector) {
      dkimRecords = await lookupTxt(`${selector}._domainkey.${domain}`);
    } else {
      dkimRecords = await lookupTxt(`default._domainkey.${domain}`).catch(() => []);
    }
    res.status(200).json({
      dkim:
        dkimRecords.length > 0
          ? parseDkim(dkimRecords)
          : {
              pass: false,
              message: 'No DKIM record found',
              recommendation: 'Publish a DKIM record or specify a selector',
              example: 'v=DKIM1; k=rsa; p=base64publickey',
              spec: DKIM_SPEC,
            },
      dmarc: parseDmarc(dmarcRecords),
      mtaSts: parseMtaSts(mtaStsRecords),
      tlsRpt: parseTlsRpt(tlsRptRecords),
      bimi: parseBimi(bimiRecords),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Lookup failed' });
  }
}
