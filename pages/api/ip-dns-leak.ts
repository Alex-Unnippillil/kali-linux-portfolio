import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
import dns from 'dns/promises';
import tls from 'tls';
import packet from 'dns-packet';

setupUrlGuard();

interface ResolverInfo {
  transport: 'DoH' | 'DoT' | 'plain';
  resolver: string;
  asn?: string;
  ip?: string;
  error?: string;
}

interface ApiResponse {
  resolvers: ResolverInfo[];
}

async function fetchAsn(ip: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.bgpview.io/ip/${ip}`);
    if (!res.ok) return undefined;
    const data = await res.json();
    const asn = data?.data?.asn?.asn;
    return asn ? `AS${asn}` : undefined;
  } catch {
    return undefined;
  }
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const results: ResolverInfo[] = [];

  // DoH probe using Cloudflare
  try {
    const dohRes = await fetch(
      'https://cloudflare-dns.com/dns-query?name=whoami.cloudflare&type=A',
      {
        headers: { Accept: 'application/dns-json' },
      }
    );
    const dohJson = await dohRes.json();
    const ip = dohJson.Answer?.[0]?.data as string | undefined;
    const resolver = '1.1.1.1';
    const asn = await fetchAsn(resolver);
    results.push({ transport: 'DoH', resolver, ip, asn });
  } catch (e: any) {
    results.push({
      transport: 'DoH',
      resolver: '1.1.1.1',
      error: e?.message || 'lookup failed',
    });
  }

  // DoT probe to Cloudflare
  try {
    const query = packet.encode({
      type: 'query',
      id: 1,
      flags: packet.RECURSION_DESIRED,
      questions: [{ type: 'A', name: 'whoami.cloudflare' }],
    });
    const len = Buffer.alloc(2);
    len.writeUInt16BE(query.length);

    const response: Buffer = await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const socket = tls.connect(853, '1.1.1.1', { rejectUnauthorized: false });
      socket.on('error', reject);
      socket.on('data', (d) => chunks.push(d));
      socket.on('end', () => resolve(Buffer.concat(chunks)));
      socket.on('connect', () => socket.write(Buffer.concat([len, query])));
    });

    const msg = packet.decode(response.slice(2));
    const ip = (msg.answers && msg.answers[0]?.data) as string | undefined;
    const resolver = '1.1.1.1';
    const asn = await fetchAsn(resolver);
    results.push({ transport: 'DoT', resolver, ip, asn });
  } catch (e: any) {
    results.push({
      transport: 'DoT',
      resolver: '1.1.1.1',
      error: e?.message || 'lookup failed',
    });
  }

  // Plain DNS using system resolver
  try {
    const servers = dns.getServers();
    const ip = (await dns.resolve4('whoami.cloudflare'))[0];
    const resolver = servers[0];
    const asn = await fetchAsn(resolver);
    results.push({ transport: 'plain', resolver, ip, asn });
  } catch (e: any) {
    const servers = dns.getServers();
    results.push({
      transport: 'plain',
      resolver: servers[0] || 'unknown',
      error: e?.message || 'lookup failed',
    });
  }

  res.status(200).json({ resolvers: results });
}


