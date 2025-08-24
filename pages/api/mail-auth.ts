import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

type CacheEntry = {
  data: string[];
  expires: number;
  promise?: Promise<string[]>;
};

const TXT_CACHE: Record<string, CacheEntry> = {};
const TLSA_CACHE: Record<string, CacheEntry> = {};
const TXT_TTL = 5 * 60 * 1000; // 5 minutes

const RESULT_CACHE = new LRUCache<string, any>({ ttl: TXT_TTL, max: 100 });
const RATE_LIMIT = new LRUCache<string, { count: number }>({ ttl: 60_000, max: 500 });

function checkRateLimit(req: NextApiRequest): boolean {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  const entry = RATE_LIMIT.get(ip) || { count: 0 };
  if (entry.count >= 30) return false;
  entry.count += 1;
  RATE_LIMIT.set(ip, entry);
  return true;
}

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

async function lookupTlsa(name: string): Promise<string[]> {
  const now = Date.now();
  const cached = TLSA_CACHE[name];
  if (cached) {
    if (cached.data.length && cached.expires > now) return cached.data;
    if (cached.promise) return cached.promise;
  }

  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TLSA`;
  const promise = fetch(url, { headers: { Accept: 'application/dns-json' } })
    .then((res) => {
      if (!res.ok) throw new Error('DNS query failed');
      return res.json();
    })
    .then((data) => {
      const answers = data.Answer || [];
      const records = answers.map((a: any) => String(a.data));
      TLSA_CACHE[name] = { data: records, expires: now + TXT_TTL };
      return records;
    })
    .catch((err) => {
      delete TLSA_CACHE[name];
      throw err;
    });

  TLSA_CACHE[name] = { data: [], expires: 0, promise };
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

const SPF_SPEC = 'https://www.rfc-editor.org/rfc/rfc7208';

function parseSpf(records: string[]) {
  const record = records.find((r) => r.toLowerCase().startsWith('v=spf1'));
  if (!record) {
    return {
      pass: false,
      message: 'No SPF record found',
      recommendation: 'Publish a TXT record with v=spf1',
      example: 'v=spf1 mx -all',
      spec: SPF_SPEC,
    };
  }
  if (!/[-~?+]all/i.test(record)) {
    return {
      pass: false,
      record,
      message: 'SPF record missing all mechanism',
      recommendation: 'End SPF record with -all',
      example: 'v=spf1 mx -all',
      spec: SPF_SPEC,
    };
  }
  return { pass: true, record, spec: SPF_SPEC };
}

const DANE_SPEC = 'https://www.rfc-editor.org/rfc/rfc6698';

function parseDane(records: string[]) {
  if (!records.length) {
    return {
      pass: false,
      message: 'No TLSA record found',
      recommendation: 'Publish TLSA record at _25._tcp',
      example: '3 1 1 base64hash',
      spec: DANE_SPEC,
    };
  }
  return { pass: true, record: records.join(' | '), spec: DANE_SPEC };
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
  const logo = record.match(/l=([^;]+)/i)?.[1];
  return { pass: true, record, logo, spec: BIMI_SPEC };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!checkRateLimit(req)) {
    res.status(429).json({ error: 'Too Many Requests' });
    return;
  }
  const { domain, selector } = req.query;
  if (typeof domain !== 'string') {
    res.status(400).json({ error: 'domain parameter required' });
    return;
  }
  const cacheKey = `${domain}|${selector || ''}`;
  const cached = RESULT_CACHE.get(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }
  try {
    const [spfRecords, dmarcRecords, mtaStsRecords, tlsRptRecords, bimiRecords, daneRecords] =
      await Promise.all([
        lookupTxt(domain),
        lookupTxt(`_dmarc.${domain}`),
        lookupTxt(`_mta-sts.${domain}`),
        lookupTxt(`_smtp._tls.${domain}`),
        lookupTxt(`default._bimi.${domain}`),
        lookupTlsa(`_25._tcp.${domain}`),
      ]);
    let dkimRecords: string[] = [];
    if (typeof selector === 'string' && selector) {
      dkimRecords = await lookupTxt(`${selector}._domainkey.${domain}`);
    } else {
      dkimRecords = await lookupTxt(`default._domainkey.${domain}`).catch(() => []);
    }

    const mtaStsResult = parseMtaSts(mtaStsRecords);
    if (mtaStsResult.pass) {
      const ok = await fetch(`https://mta-sts.${domain}/.well-known/mta-sts.txt`)
        .then((r) => r.ok)
        .catch(() => false);
      if (!ok) {
        mtaStsResult.pass = false;
        mtaStsResult.message = 'MTA-STS policy file not accessible';
        mtaStsResult.recommendation = `Serve policy at https://mta-sts.${domain}/.well-known/mta-sts.txt`;
      }
    }

    const bimiResult = parseBimi(bimiRecords);
    if (bimiResult.pass && bimiResult.logo) {
      const ok = await fetch(bimiResult.logo)
        .then((r) => r.ok)
        .catch(() => false);
      if (!ok) {
        bimiResult.pass = false;
        bimiResult.message = 'BIMI logo URL not reachable';
        bimiResult.recommendation = 'Ensure logo URL is accessible via HTTPS';
      }
    }

    const result = {
      spf: parseSpf(spfRecords),
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
      mtaSts: mtaStsResult,
      tlsRpt: parseTlsRpt(tlsRptRecords),
      dane: parseDane(daneRecords),
      bimi: bimiResult,
    };
    RESULT_CACHE.set(cacheKey, result);
    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Lookup failed' });
  }
}
