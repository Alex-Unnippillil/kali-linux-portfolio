import React, { useState, useMemo, useCallback } from 'react';
import CryptoJS from 'crypto-js';

function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, any>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const res = fn(...args);
    cache.set(key, res);
    return res;
  }) as T;
}

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

function parseIID(iid: string): Uint8Array {
  const clean = iid.replace(/[^0-9a-f]/gi, '').toLowerCase();
  if (clean.length !== 16) return new Uint8Array();
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i += 1) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
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

const parseMacMemo = memoize(parseMac);
const parseIPv6Memo = memoize(parseIPv6);
const parseIIDMemo = memoize(parseIID);
const combineMemo = memoize(combine);

function validatePrefix(prefix: string): Uint8Array | null {
  const [addr, len] = prefix.split('/');
  if (len !== '64') return null;
  const bytes = parseIPv6Memo(addr);
  if (bytes.length !== 16) return null;
  return bytes.slice(0, 8);
}

function validateIID(iid: string): Uint8Array | null {
  const bytes = parseIIDMemo(iid);
  return bytes.length === 8 ? bytes : null;
}

function computeEui64(prefix: string, mac: string): string {
  const prefixBytes = validatePrefix(prefix);
  const macBytes = parseMacMemo(mac);
  if (!prefixBytes || macBytes.length !== 6) return '';
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
  return combineMemo(prefixBytes, iid);
}

function computeRfc7217(prefix: string, mac: string, secret: string): string {
  const prefixBytes = validatePrefix(prefix);
  if (!prefixBytes) return '';
  const macBytes = mac ? parseMacMemo(mac) : new Uint8Array();
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
  return combineMemo(prefixBytes, iid);
}

function computeFromIID(prefix: string, iid: string): string {
  const prefixBytes = validatePrefix(prefix);
  const iidBytes = validateIID(iid);
  if (!prefixBytes || !iidBytes) return '';
  return combineMemo(prefixBytes, iidBytes);
}

function computePrivacy(prefix: string): string {
  const prefixBytes = validatePrefix(prefix);
  if (!prefixBytes) return '';
  const iid = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(iid);
  } else {
    for (let i = 0; i < 8; i += 1) iid[i] = Math.floor(Math.random() * 256);
  }
  iid[0] &= 0xfc;
  return combineMemo(prefixBytes, iid);
}

function ipCommand(addr: string): string {
  return `ip addr add ${addr}/64 dev eth0`;
}

const AddressRow: React.FC<{ label: string; addr: string }> = ({ label, addr }) => {
  const copy = useCallback(() => navigator.clipboard.writeText(ipCommand(addr)), [addr]);
  return (
    <div>
      {label}: {addr || '-'}
      {addr && (
        <button
          className="ml-2 px-2 py-1 bg-blue-600 rounded"
          onClick={copy}
        >
          Copy
        </button>
      )}
    </div>
  );
};

const Ipv6Slaac: React.FC = () => {
  const [prefix, setPrefix] = useState('');
  const [mac, setMac] = useState('');
  const [secret, setSecret] = useState('');
  const [iid, setIid] = useState('');

  const prefixValid = useMemo(() => !prefix || validatePrefix(prefix) !== null, [prefix]);
  const iidValid = useMemo(() => !iid || validateIID(iid) !== null, [iid]);

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

  const provided = useMemo(() => {
    if (!prefix || !iid) return '';
    try {
      return computeFromIID(prefix, iid);
    } catch {
      return '';
    }
  }, [prefix, iid]);

  const privacy = useMemo(() => {
    if (!prefix) return '';
    try {
      return computePrivacy(prefix);
    } catch {
      return '';
    }
  }, [prefix]);

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-panel text-white space-y-4">
      <div className="space-y-2">
        <input
          className="w-full p-2 text-black rounded"
          placeholder="Prefix (e.g., 2001:db8::/64)"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
        />
        {!prefixValid && prefix && (
          <div className="text-red-500 text-sm">Prefix must be /64</div>
        )}
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
        <input
          className="w-full p-2 text-black rounded"
          placeholder="IID (optional 64-bit hex)"
          value={iid}
          onChange={(e) => setIid(e.target.value)}
        />
        {!iidValid && iid && (
          <div className="text-red-500 text-sm">IID must be 64-bit hex</div>
        )}
      </div>
      <div className="font-mono">RA {prefix || '-'} → IID {iid || '-'} → {provided || '-'}</div>
      <div className="space-y-2 font-mono">
        <AddressRow label="Provided IID" addr={provided} />
        <AddressRow label="EUI-64" addr={eui64} />
        <AddressRow label="RFC7217" addr={rfc7217} />
        <AddressRow label="Privacy" addr={privacy} />
      </div>
    </div>
  );
};

export default Ipv6Slaac;
export const displayIpv6Slaac = () => <Ipv6Slaac />;

