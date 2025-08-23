import React, { useState, useMemo } from 'react';
import CryptoJS from 'crypto-js';

function parseMac(mac: string): Uint8Array {
  const clean = mac.replace(/[^0-9a-f]/gi, '').toLowerCase();
  if (clean.length !== 12) return new Uint8Array();
  const bytes = new Uint8Array(6);
  for (let i = 0; i < 6; i += 1) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function parseIPv6(addr: string): Uint8Array {
  const [address] = addr.split('/');
  const parts = address.split('::');
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - (head.length + tail.length);
  const nums = [...head, ...Array(missing).fill('0'), ...tail].map((p) =>
    parseInt(p || '0', 16)
  );
  const bytes = new Uint8Array(16);
  nums.forEach((n, i) => {
    bytes[i * 2] = (n >> 8) & 0xff;
    bytes[i * 2 + 1] = n & 0xff;
  });
  return bytes;
}

function bytesToIPv6(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    parts.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  }
  // zero compression
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  parts.forEach((p, i) => {
    if (p === '0') {
      if (curStart === -1) {
        curStart = i;
        curLen = 1;
      } else {
        curLen += 1;
      }
    } else if (curStart !== -1) {
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
      curStart = -1;
    }
  });
  if (curStart !== -1 && curLen > bestLen) {
    bestStart = curStart;
    bestLen = curLen;
  }
  if (bestLen > 1) {
    parts.splice(bestStart, bestLen, '');
    if (bestStart === 0) parts.unshift('');
    if (bestStart === parts.length) parts.push('');
  }
  return parts.join(':').replace(/:{3,}/, '::');
}

function combine(prefix: Uint8Array, iid: Uint8Array): string {
  const bytes = new Uint8Array(16);
  bytes.set(prefix, 0);
  bytes.set(iid, 8);
  return bytesToIPv6(bytes);
}

function computeEui64(prefix: string, mac: string): string {
  const prefixBytes = parseIPv6(prefix).slice(0, 8);
  const macBytes = parseMac(mac);
  if (macBytes.length !== 6) return '';
  const iid = new Uint8Array([
    macBytes[0] ^ 0x02,
    macBytes[1],
    macBytes[2],
    0xff,
    0xfe,
    macBytes[3],
    macBytes[4],
    macBytes[5],
  ]);
  return combine(prefixBytes, iid);
}

function computeRfc7217(prefix: string, mac: string, secret: string): string {
  const prefixBytes = parseIPv6(prefix).slice(0, 8);
  const macBytes = mac ? parseMac(mac) : new Uint8Array();
  const secretBytes = secret ? new TextEncoder().encode(secret) : new Uint8Array();
  const all = new Uint8Array(prefixBytes.length + macBytes.length + secretBytes.length);
  all.set(prefixBytes);
  all.set(macBytes, prefixBytes.length);
  all.set(secretBytes, prefixBytes.length + macBytes.length);
  const wordArray = CryptoJS.lib.WordArray.create(all as any);
  const hashHex = CryptoJS.SHA256(wordArray).toString();
  const iid = new Uint8Array(8);
  for (let i = 0; i < 8; i += 1) {
    iid[i] = parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
  }
  iid[0] &= 0xfc; // clear u and g bits
  return combine(prefixBytes, iid);
}

const Ipv6Slaac: React.FC = () => {
  const [prefix, setPrefix] = useState('');
  const [mac, setMac] = useState('');
  const [secret, setSecret] = useState('');

  const eui64 = useMemo(() => {
    if (!prefix || !mac) return '';
    try {
      return computeEui64(prefix, mac);
    } catch {
      return '';
    }
  }, [prefix, mac]);

  const rfc7217 = useMemo(() => {
    if (!prefix) return '';
    try {
      return computeRfc7217(prefix, mac, secret);
    } catch {
      return '';
    }
  }, [prefix, mac, secret]);

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-panel text-white space-y-4">
      <div className="space-y-2">
        <input
          className="w-full p-2 text-black rounded"
          placeholder="Prefix (e.g., 2001:db8::/64)"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
        />
        <input
          className="w-full p-2 text-black rounded"
          placeholder="MAC address (optional)"
          value={mac}
          onChange={(e) => setMac(e.target.value)}
        />
        <input
          className="w-full p-2 text-black rounded"
          placeholder="Secret (optional)"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </div>
      <div className="space-y-2 font-mono">
        <div>EUI-64: {eui64 || '-'}</div>
        <div>RFC7217: {rfc7217 || '-'}</div>
      </div>
    </div>
  );
};

export default Ipv6Slaac;
export const displayIpv6Slaac = () => <Ipv6Slaac />;

