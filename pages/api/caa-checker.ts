import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface CaaRecord {
  flags: number;
  tag: string;
  value: string;
}

interface EffectivePolicy {
  issue: string[];
  issuewild: string[];
  iodef: string | null;
}

interface CaaResponse {
  ok: boolean;
  records: CaaRecord[];
  issues: string[];
  policyDomain: string;
  examples?: string;
  notes: string[];
  effective: EffectivePolicy;
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

    const issueValues = records
      .filter((r) => r.tag === 'issue')
      .map((r) => r.value);
    const issuewildValues = records
      .filter((r) => r.tag === 'issuewild')
      .map((r) => r.value);
    const iodefValues = records
      .filter((r) => r.tag === 'iodef')
      .map((r) => r.value);

    const effective: EffectivePolicy = {
      issue: issueValues,
      issuewild: issuewildValues.length > 0 ? issuewildValues : issueValues,
      iodef: iodefValues[0] || null,
    };

    const issues: string[] = [];
    if (records.length === 0) {
      issues.push('No CAA records found');
    }
    if (issueValues.length === 0) {
      issues.push('No issue tag: any CA can issue non-wildcard certificates.');
    }
    if (effective.issuewild.length === 0) {
      issues.push('No wildcard policy: any CA can issue wildcard certificates.');
    }
    if (iodefValues.length === 0) {
      issues.push('No iodef contact defined.');
    }

    const examplesParts: string[] = [];
    if (issueValues.length === 0) examplesParts.push(`0 issue "letsencrypt.org"`);
    if (issuewildValues.length === 0)
      examplesParts.push(`0 issuewild "letsencrypt.org"`);
    if (iodefValues.length === 0)
      examplesParts.push(`0 iodef "mailto:security@${domain}"`);
    const examples =
      examplesParts.length > 0 ? examplesParts.join('\n') + '\n' : undefined;

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
      examples,
      notes,
      effective,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}

