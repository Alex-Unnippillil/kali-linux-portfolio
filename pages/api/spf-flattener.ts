import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

const MAX_LOOKUPS = 10;
const CONCURRENCY_LIMIT = 5;
const MAX_STRING_LENGTH = 255;

interface SPFNode {
  domain: string;
  record?: string;
  ttl?: number;
  includes: SPFNode[];
  ips: string[];
  lookup?: number;
  warnings?: string[];
}

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface State {
  lookups: number;
  warnings: string[];
  cache: Map<string, { record: string; ttl: number } | null>;
  path: Set<string>;
  lookupLog: { domain: string; type: string; count: number }[];
}

async function dnsQuery(domain: string, type: string, state: State): Promise<DnsAnswer[]> {
  if (state.lookups >= MAX_LOOKUPS) {
    state.warnings.push(`Lookup limit of ${MAX_LOOKUPS} exceeded at ${domain}`);
    return [];
  }
  state.lookups += 1;
  state.lookupLog.push({ domain, type, count: state.lookups });
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`;
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });
  if (!res.ok) throw new Error('DNS query failed');
  const data = await res.json();
  return data.Answer || [];
}

async function lookupSpf(domain: string, state: State): Promise<{ record: string; ttl: number } | null> {
  if (state.cache.has(domain)) {
    const cached = state.cache.get(domain) || null;
    return cached;
  }
  const answers = await dnsQuery(domain, 'TXT', state);
  const entry = answers.find((a: DnsAnswer) =>
    String(a.data)
      .replace(/^"|"$/g, '')
      .replace(/"\s"/g, '')
      .startsWith('v=spf1')
  );
  if (!entry) {
    state.warnings.push(`Void lookup for ${domain}`);
    state.cache.set(domain, null);
    return null;
  }
  const record = String(entry.data)
    .replace(/^"|"$/g, '')
    .replace(/"\s"/g, '');
  const result = { record, ttl: entry.TTL };
  state.cache.set(domain, result);
  return result;
}

async function lookupA(domain: string, state: State): Promise<{ ips: string[]; ttl: number }> {
  const answersA = await dnsQuery(domain, 'A', state);
  const answersAAAA = await dnsQuery(domain, 'AAAA', state);
  const ips: string[] = [];
  let ttl = Infinity;
  for (const a of answersA) {
    ips.push(`ip4:${a.data}`);
    ttl = Math.min(ttl, a.TTL);
  }
  for (const aaaa of answersAAAA) {
    ips.push(`ip6:${aaaa.data}`);
    ttl = Math.min(ttl, aaaa.TTL);
  }
  return { ips, ttl };
}

async function lookupMx(domain: string, state: State): Promise<{ ips: string[]; ttl: number }> {
  const answers = await dnsQuery(domain, 'MX', state);
  let ttl = Infinity;
  let ips: string[] = [];
  for (const ans of answers) {
    ttl = Math.min(ttl, ans.TTL);
    const parts = String(ans.data).split(' ');
    const host = parts[parts.length - 1];
    const r = await lookupA(host, state);
    ips = ips.concat(r.ips);
    ttl = Math.min(ttl, r.ttl);
  }
  return { ips, ttl };
}

async function lookupPtr(domain: string, state: State): Promise<void> {
  await dnsQuery(domain, 'PTR', state);
  state.warnings.push(`PTR mechanism for ${domain} cannot be flattened`);
}

async function parallelMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function resolveSpf(domain: string, state: State): Promise<{ node: SPFNode; allIps: string[]; minTtl: number }> {
  if (state.path.has(domain)) {
    state.warnings.push(`Circular include detected for ${domain}`);
    return { node: { domain, includes: [], ips: [], warnings: ['circular include'] }, allIps: [], minTtl: Infinity };
  }
  state.path.add(domain);
  const spf = await lookupSpf(domain, state);
  if (!spf) {
    state.path.delete(domain);
    return { node: { domain, includes: [], ips: [] }, allIps: [], minTtl: Infinity };
  }
  const currentLookup = state.lookups;
  const tokens = spf.record.split(/\s+/).filter(Boolean);
  const ips: string[] = [];
  const includeDomains: string[] = [];
  const includes: SPFNode[] = [];
  let allIps: string[] = [];
  let minTtl = spf.ttl;
  const nodeWarnings: string[] = [];

  for (const token of tokens) {
    if (token.startsWith('include:')) {
      includeDomains.push(token.slice(8));
    } else if (token.startsWith('redirect=')) {
      includeDomains.push(token.slice(9));
    } else if (token.startsWith('ip4:') || token.startsWith('ip6:')) {
      ips.push(token);
      allIps.push(token);
    } else if (token === 'a' || token.startsWith('a:')) {
      const target = token.includes(':') ? token.slice(token.indexOf(':') + 1) : domain;
      const res = await lookupA(target, state);
      ips.push(...res.ips);
      allIps.push(...res.ips);
      minTtl = Math.min(minTtl, res.ttl);
    } else if (token === 'mx' || token.startsWith('mx:')) {
      const target = token.includes(':') ? token.slice(token.indexOf(':') + 1) : domain;
      const res = await lookupMx(target, state);
      ips.push(...res.ips);
      allIps.push(...res.ips);
      minTtl = Math.min(minTtl, res.ttl);
    } else if (token === 'ptr' || token.startsWith('ptr:')) {
      const target = token.includes(':') ? token.slice(token.indexOf(':') + 1) : domain;
      await lookupPtr(target, state);
    } else if (/%\{/.test(token)) {
      nodeWarnings.push(`Macro detected: ${token}`);
      state.warnings.push(`Macro detected in ${domain}`);
    }
  }

  const results = await parallelMap(includeDomains, CONCURRENCY_LIMIT, (sub) => resolveSpf(sub, state));
  for (const r of results) {
    includes.push(r.node);
    allIps = allIps.concat(r.allIps);
    minTtl = Math.min(minTtl, r.minTtl);
  }

  state.path.delete(domain);

  const node: SPFNode = {
    domain,
    record: spf.record,
    ttl: spf.ttl,
    includes,
    ips,
    lookup: currentLookup,
    warnings: nodeWarnings.length ? nodeWarnings : undefined,
  };
  const uniqueIps = Array.from(new Set(allIps));
  return { node, allIps: uniqueIps, minTtl };
}

function buildFlattenedSpfRecord(ips: string[]): string {
  return `v=spf1 ${ips.join(' ')} -all`;
}

function buildSplitRecords(domain: string, ips: string[]) {
  const records: string[] = [];
  let current: string[] = [];
  let length = 'v=spf1 '.length + ' -all'.length;
  for (const ip of ips) {
    const addition = ip.length + 1;
    if (length + addition > MAX_STRING_LENGTH && current.length) {
      records.push(`v=spf1 ${current.join(' ')} -all`);
      current = [ip];
      length = 'v=spf1 '.length + ip.length + 1 + ' -all'.length;
    } else {
      current.push(ip);
      length += addition;
    }
  }
  if (current.length) records.push(`v=spf1 ${current.join(' ')} -all`);

  const parts: Record<string, string> = {};
  records.forEach((rec, idx) => {
    parts[`_spf${idx}.${domain}`] = rec;
  });
  const root =
    records.length > 1
      ? `v=spf1 ${records.map((_, idx) => `include:_spf${idx}.${domain}`).join(' ')} -all`
      : records[0] || 'v=spf1 -all';
  return { root, parts };
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
    const state: State = {
      lookups: 0,
      warnings: [],
      cache: new Map(),
      path: new Set(),
      lookupLog: [],
    };
    const result = await resolveSpf(domain.toLowerCase(), state);
    const flattenedSpfRecord = buildFlattenedSpfRecord(result.allIps);
    const length = flattenedSpfRecord.length;
    const ttl = result.minTtl === Infinity ? 0 : result.minTtl;
    const split = buildSplitRecords(domain.toLowerCase(), result.allIps);
    return res.status(200).json({
      chain: result.node,
      ips: result.allIps,
      ttl,
      length,
      flattenedSpfRecord,
      split,
      lookups: state.lookups,
      warnings: state.warnings,
      lookupLog: state.lookupLog,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Lookup failed' });
  }
}

