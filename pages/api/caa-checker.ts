import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface CaaRecord {
  flags: number;
  tag: string;
  value: string;
}

interface CaaResponse {
  ok: boolean;
  records: CaaRecord[];
  issues: string[];
  policyDomain: string;
  recommendation?: string;
  notes: string[];
}

const CACHE_TTL_MS = 5 * 60 * 1000; // five minutes
const cache = new Map<string, { expires: number; records: CaaRecord[] }>();

async function fetchCaa(domain: string): Promise<CaaRecord[]> {
  const cached = cache.get(domain);
  if (cached && cached.expires > Date.now()) {
    return cached.records;
  }
  const endpoint = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CAA`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error('Upstream server error');
  }
  const data = await response.json();
  const records: CaaRecord[] = (data.Answer || []).map((ans: any) => {
    const match = ans.data.match(/^(\d+)\s+([a-zA-Z0-9]+)\s+"?(.*?)"?$/);
    if (match) {
      return {
        flags: parseInt(match[1], 10),
        tag: match[2].toLowerCase(),
        value: match[3].replace(/^"|"$/g, ''),
      };
    }
    return { flags: 0, tag: '', value: ans.data };
  });
  cache.set(domain, { expires: Date.now() + CACHE_TTL_MS, records });
  return records;
}

function parentDomain(domain: string): string | null {
  const parts = domain.split('.');
  if (parts.length <= 1) return null;
  parts.shift();
  return parts.join('.');
}

async function getEffectiveCaa(domain: string): Promise<{
  records: CaaRecord[];
  policyDomain: string;
}> {
  let current = domain;
  while (true) {
    const records = await fetchCaa(current);
    if (records.length > 0) {
      return { records, policyDomain: current };
    }
    const parent = parentDomain(current);
    if (!parent) {
      return { records: [], policyDomain: domain };
    }
    current = parent;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CaaResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain } = req.query;
  if (!domain || typeof domain !== 'string' || !/^[A-Za-z0-9.-]+$/.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain' });
  }

  try {
    const { records, policyDomain } = await getEffectiveCaa(domain);

    const issues: string[] = [];
    if (records.length === 0) {
      issues.push('No CAA records found');
    }

    const hasIssue = records.some((r) => r.tag === 'issue');
    const hasIssueWild = records.some((r) => r.tag === 'issuewild');
    const hasIodef = records.some((r) => r.tag === 'iodef');

    if (!hasIssue) issues.push('Missing issue record');
    if (!hasIodef) issues.push('Missing iodef record');

    const issuers = records.filter((r) => r.tag === 'issue').map((r) => r.value);
    const uniqueIssuers = Array.from(new Set(issuers));
    if (uniqueIssuers.length > 1) issues.push('Multiple issuers present');

    const recParts: string[] = [];
    if (!hasIssue) recParts.push(`0 issue "letsencrypt.org"`);
    if (!hasIssueWild) recParts.push(`0 issuewild "letsencrypt.org"`);
    if (!hasIodef) recParts.push(`0 iodef "mailto:security@${domain}"`);
    const recommendation =
      recParts.length > 0 ? recParts.join('\n') + '\n' : undefined;

    const notes: string[] = [];
    if (records.some((r) => (r.flags & 0x80) !== 0)) {
      notes.push(
        'Critical flag set: unrecognized tags must be understood by CAs or issuance is forbidden.'
      );
    }
    notes.push(
      `Records at ${policyDomain} apply to ${domain}. More specific subdomains override parent policies.`
    );

    return res.status(200).json({
      ok: issues.length === 0,
      records,
      issues,
      policyDomain,
      recommendation,
      notes,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}

