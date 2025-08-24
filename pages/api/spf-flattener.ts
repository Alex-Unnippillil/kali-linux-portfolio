import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate';

const MAX_DEPTH = 10;

interface SPFNode {
  domain: string;
  record?: string;
  ttl?: number;
  includes: SPFNode[];
  ips: string[];
}

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

async function lookupSpf(domain: string): Promise<{ record: string; ttl: number } | null> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=TXT`;
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });
  if (!res.ok) throw new Error('DNS query failed');
  const data = await res.json();
  const answers: DnsAnswer[] = data.Answer || [];
  const entry = answers.find((a: DnsAnswer) =>
    String(a.data)
      .replace(/^"|"$/g, '')
      .replace(/"\s"/g, '')
      .startsWith('v=spf1')
  );
  if (!entry) return null;
  const record = String(entry.data)
    .replace(/^"|"$/g, '')
    .replace(/"\s"/g, '');
  return { record, ttl: entry.TTL };
}

async function resolveSpf(
  domain: string,
  depth = 0,
  visited: Set<string> = new Set()
): Promise<{ node: SPFNode; allIps: string[]; minTtl: number }> {
  if (depth >= MAX_DEPTH || visited.has(domain)) {
    return {
      node: { domain, includes: [], ips: [] },
      allIps: [],
      minTtl: Infinity,
    };
  }
  visited.add(domain);
  const spf = await lookupSpf(domain);
  if (!spf) {
    return {
      node: { domain, includes: [], ips: [] },
      allIps: [],
      minTtl: Infinity,
    };
  }
  const tokens = spf.record.split(/\s+/).filter(Boolean);
  const ips: string[] = [];
  const includes: SPFNode[] = [];
  let allIps: string[] = [];
  let minTtl = spf.ttl;

  for (const token of tokens) {
    if (token.startsWith('include:')) {
      const sub = token.slice(8);
      const r = await resolveSpf(sub, depth + 1, visited);
      includes.push(r.node);
      allIps = allIps.concat(r.allIps);
      minTtl = Math.min(minTtl, r.minTtl);
    } else if (token.startsWith('redirect=')) {
      const sub = token.slice(9);
      const r = await resolveSpf(sub, depth + 1, visited);
      includes.push(r.node);
      allIps = allIps.concat(r.allIps);
      minTtl = Math.min(minTtl, r.minTtl);
    } else if (token.startsWith('ip4:') || token.startsWith('ip6:')) {
      ips.push(token);
      allIps.push(token);
    }
  }

  const node: SPFNode = { domain, record: spf.record, ttl: spf.ttl, includes, ips };
  const uniqueIps = Array.from(new Set(allIps));
  return { node, allIps: uniqueIps, minTtl };
}

function buildFlattenedSpfRecord(ips: string[]): string {
  return `v=spf1 ${ips.join(' ')} -all`;
}

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
};

const querySchema = z.object({ domain: z.string().min(1) });
const bodySchema = z.object({});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const parsed = validateRequest(req, res, {
    querySchema,
    bodySchema,
    queryLimit: 1024,
    bodyLimit: 1024,
  });
  if (!parsed) return;
  const { domain } = parsed.query as { domain: string };
  try {
    const result = await resolveSpf(domain.toLowerCase());
    const flattenedSpfRecord = buildFlattenedSpfRecord(result.allIps);
    const length = flattenedSpfRecord.length;
    const ttl = result.minTtl === Infinity ? 0 : result.minTtl;
    return res.status(200).json({
      chain: result.node,
      ips: result.allIps,
      ttl,
      length,
      flattenedSpfRecord,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Lookup failed' });
  }
}

