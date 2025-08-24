import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
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

type RaFlags = { m: boolean; o: boolean; a: boolean; l: boolean };

const osOptions = {
  linux: { name: 'Linux', eui64: false, rfc7217: true, privacy: true },
  windows: { name: 'Windows', eui64: false, rfc7217: true, privacy: true },
  macos: { name: 'macOS', eui64: true, rfc7217: false, privacy: true },
};
type OsKey = keyof typeof osOptions;

const raPresets = [
  {
    name: 'SLAAC',
    prefix: '2001:db8::/64',
    flags: { m: false, o: false, a: true, l: true } as RaFlags,
    valid: 3600,
    preferred: 1800,
  },
  {
    name: 'DHCPv6 Stateless',
    prefix: '2001:db8:1::/64',
    flags: { m: false, o: true, a: false, l: true } as RaFlags,
    valid: 3600,
    preferred: 1800,
  },
  {
    name: 'DHCPv6 Stateful',
    prefix: '2001:db8:2::/64',
    flags: { m: true, o: true, a: false, l: true } as RaFlags,
    valid: 3600,
    preferred: 1800,
  },
];

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
  const secretBytes = secret
    ? new TextEncoder().encode(secret)
    : new Uint8Array();
  const all = new Uint8Array(
    prefixBytes.length + macBytes.length + secretBytes.length
  );
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

const AddressRow: React.FC<{
  label: string;
  addr: string;
  valid: number;
  preferred: number;
  onRefresh?: () => void;
}> = ({ label, addr, valid, preferred, onRefresh }) => {
  const copy = useCallback(
    () => navigator.clipboard.writeText(ipCommand(addr)),
    [addr]
  );
  const [dad, setDad] = useState('tentative');
  useEffect(() => {
    if (!addr) return;
    setDad('tentative');
    const t = setTimeout(() => setDad('preferred'), 500);
    return () => clearTimeout(t);
  }, [addr]);
  return (
    <div>
      {label}: {addr || '-'}
      {addr && (
        <>
          <span className="ml-2 text-sm">
            [{dad}, v={valid}s p={preferred}s]
          </span>
          <button className="ml-2 px-2 py-1 bg-blue-600 rounded" onClick={copy}>
            Copy
          </button>
          {onRefresh && (
            <button
              className="ml-2 px-2 py-1 bg-green-600 rounded"
              onClick={onRefresh}
            >
              New
            </button>
          )}
        </>
      )}
    </div>
  );
};

const Ipv6Slaac: React.FC = () => {
  const [preset, setPreset] = useState('');
  const [flags, setFlags] = useState<RaFlags>({
    m: false,
    o: false,
    a: true,
    l: true,
  });
  const [validLifetime, setValidLifetime] = useState(3600);
  const [preferredLifetime, setPreferredLifetime] = useState(1800);
  const [prefix, setPrefix] = useState('');
  const [mac, setMac] = useState('');
  const [secret, setSecret] = useState('');
  const [iid, setIid] = useState('');
  const [privacySeed, setPrivacySeed] = useState(0);
  const [os, setOs] = useState<OsKey>('linux');
  const [ndLog, setNdLog] = useState<string[]>([]);
  const prevAddrs = useRef({
    eui64: '',
    rfc7217: '',
    provided: '',
    privacy: '',
  });

  const handlePreset = useCallback((name: string) => {
    setPreset(name);
    const p = raPresets.find((x) => x.name === name);
    if (p) {
      setPrefix(p.prefix);
      setFlags(p.flags);
      setValidLifetime(p.valid);
      setPreferredLifetime(p.preferred);
    }
  }, []);

  const prefixValid = useMemo(
    () => !prefix || validatePrefix(prefix) !== null,
    [prefix]
  );
  const iidValid = useMemo(() => !iid || validateIID(iid) !== null, [iid]);

  useEffect(() => {
    if (!prefix) {
      setNdLog([]);
      prevAddrs.current = { eui64: '', rfc7217: '', provided: '', privacy: '' };
      return;
    }
    const flagStr = `${flags.m ? 'M' : ''}${flags.o ? 'O' : ''}${
      flags.a ? 'A' : ''
    }${flags.l ? 'L' : ''}`;
    setNdLog([`RA ${prefix} [${flagStr}]`]);
    prevAddrs.current = { eui64: '', rfc7217: '', provided: '', privacy: '' };
  }, [prefix, flags, validLifetime, preferredLifetime]);

  useEffect(() => {
    const logs: string[] = [];
    const prev = prevAddrs.current;
    const check = (label: string, addr: string, key: keyof typeof prev) => {
      if (addr && addr !== prev[key]) {
        logs.push(`NS ${addr} (${label})`, `NA ${addr} (${label})`);
        prev[key] = addr;
      }
    };
    check('EUI-64', eui64, 'eui64');
    check('RFC7217', rfc7217, 'rfc7217');
    check('IID', provided, 'provided');
    check('Privacy', privacy, 'privacy');
    if (logs.length) setNdLog((l) => [...l, ...logs]);
  }, [eui64, rfc7217, provided, privacy]);

  const eui64 = useMemo(() => {
    if (!prefix || !mac || !flags.a) return '';
    try {
      return computeEui64(prefix, mac);
    } catch {
      return '';
    }
  }, [prefix, mac, flags]);

  const rfc7217 = useMemo(() => {
    if (!prefix || !flags.a) return '';
    try {
      return computeRfc7217(prefix, mac, secret);
    } catch {
      return '';
    }
  }, [prefix, mac, secret, flags]);

  const provided = useMemo(() => {
    if (!prefix || !iid || !flags.a) return '';
    try {
      return computeFromIID(prefix, iid);
    } catch {
      return '';
    }
  }, [prefix, iid, flags]);

  const privacy = useMemo(() => {
    if (!prefix || !flags.a) return '';
    try {
      return computePrivacy(prefix);
    } catch {
      return '';
    }
  }, [prefix, privacySeed, flags]);

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-panel text-white space-y-4">
      <div className="space-y-2">
        <select
          className="w-full p-2 text-black rounded"
          value={preset}
          onChange={(e) => handlePreset(e.target.value)}
        >
          <option value="">Custom</option>
          {raPresets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="w-full p-2 text-black rounded"
          value={os}
          onChange={(e) => setOs(e.target.value as OsKey)}
        >
          {Object.entries(osOptions).map(([k, v]) => (
            <option key={k} value={k}>
              {v.name}
            </option>
          ))}
        </select>
        <div className="flex space-x-2 text-sm">
          <label>
            <input
              type="checkbox"
              checked={flags.m}
              onChange={(e) => setFlags({ ...flags, m: e.target.checked })}
            />{' '}
            M
          </label>
          <label>
            <input
              type="checkbox"
              checked={flags.o}
              onChange={(e) => setFlags({ ...flags, o: e.target.checked })}
            />{' '}
            O
          </label>
          <label>
            <input
              type="checkbox"
              checked={flags.a}
              onChange={(e) => setFlags({ ...flags, a: e.target.checked })}
            />{' '}
            A
          </label>
          <label>
            <input
              type="checkbox"
              checked={flags.l}
              onChange={(e) => setFlags({ ...flags, l: e.target.checked })}
            />{' '}
            L
          </label>
        </div>
        <div className="flex space-x-2">
          <input
            className="w-1/2 p-2 text-black rounded"
            placeholder="Valid lifetime (s)"
            type="number"
            value={validLifetime}
            onChange={(e) =>
              setValidLifetime(parseInt(e.target.value, 10) || 0)
            }
          />
          <input
            className="w-1/2 p-2 text-black rounded"
            placeholder="Preferred lifetime (s)"
            type="number"
            value={preferredLifetime}
            onChange={(e) =>
              setPreferredLifetime(parseInt(e.target.value, 10) || 0)
            }
          />
        </div>
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
      <div className="font-mono">
        Flags: {flags.m ? 'M' : ''}
        {flags.o ? 'O' : ''}
        {flags.a ? 'A' : ''}
        {flags.l ? 'L' : ''} v={validLifetime}s p={preferredLifetime}s
      </div>
      <div className="font-mono">
        RA {prefix || '-'} → IID {iid || '-'} → {provided || '-'}
      </div>
      <div className="space-y-2 font-mono">
        <AddressRow
          label="Provided IID"
          addr={provided}
          valid={validLifetime}
          preferred={preferredLifetime}
        />
        {osOptions[os].eui64 && (
          <AddressRow
            label="EUI-64"
            addr={eui64}
            valid={validLifetime}
            preferred={preferredLifetime}
          />
        )}
        {osOptions[os].rfc7217 && (
          <AddressRow
            label="RFC7217"
            addr={rfc7217}
            valid={validLifetime}
            preferred={preferredLifetime}
          />
        )}
        {osOptions[os].privacy && (
          <AddressRow
            label="Privacy (Temp)"
            addr={privacy}
            valid={validLifetime}
            preferred={preferredLifetime}
            onRefresh={() => setPrivacySeed((s) => s + 1)}
          />
        )}
      </div>
      <div className="font-mono">
        <div>Neighbor Discovery:</div>
        <ul className="list-disc pl-4">
          {ndLog.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Ipv6Slaac;
export const displayIpv6Slaac = () => <Ipv6Slaac />;
