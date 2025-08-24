import dns from 'dns/promises';
import { isIP } from 'net';

function ipToLong(ip: string): number {
  return ip
    .split('.')
    .map((octet) => parseInt(octet, 10))
    .reduce((acc, octet) => (acc << 8) + octet);
}

function isPrivateIPv4(ip: string): boolean {
  const long = ipToLong(ip);
  const ranges = [
    [ipToLong('10.0.0.0'), ipToLong('10.255.255.255')],
    [ipToLong('172.16.0.0'), ipToLong('172.31.255.255')],
    [ipToLong('192.168.0.0'), ipToLong('192.168.255.255')],
    [ipToLong('127.0.0.0'), ipToLong('127.255.255.255')],
    [ipToLong('169.254.0.0'), ipToLong('169.254.255.255')],
  ];
  return ranges.some(([start, end]) => long >= start && long <= end);
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80')
  );
}

async function assertSafeUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid protocol');
  }
  if (url.hostname.endsWith('.local')) {
    throw new Error('Disallowed TLD');
  }
  const records = await dns.lookup(url.hostname, { all: true });
  for (const record of records) {
    if (isIP(record.address) === 4 && isPrivateIPv4(record.address)) {
      throw new Error('Private IPv4 address');
    }
    if (isIP(record.address) === 6 && isPrivateIPv6(record.address)) {
      throw new Error('Private IPv6 address');
    }
  }
}

export function setupUrlGuard(timeout = 5000) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (input: any, init: RequestInit = {}) {
    if (typeof input === 'string' || input instanceof URL) {
      try {
        await assertSafeUrl(input.toString());
      } catch {
        return new Response('Invalid or disallowed URL', { status: 400 });
      }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await originalFetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}
