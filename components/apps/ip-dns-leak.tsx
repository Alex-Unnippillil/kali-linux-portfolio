import React, { useState } from 'react';

type DnsResult = {
  hostname: string;
  resolver: string;
  addresses: string[];
  error?: string;
};

type ResolverInfo = {
  transport: 'DoH' | 'DoT' | 'plain';
  resolver: string;
  asn?: string;
  ip?: string;
  error?: string;
  mismatch?: boolean;
};

const STUN_TIMEOUT = 3000; // ms
type IpInfo = { local: string[]; public: string[]; mdns: boolean };

export const gatherIps = (): Promise<IpInfo> => {
  return new Promise((resolve, reject) => {
    const locals = new Set<string>();
    const publics = new Set<string>();
    let mdns = false;
    let settled = false;
    let stunError: string | null = null;

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pc.createDataChannel('');
      pc.onicecandidateerror = (e: any) => {
        stunError = e.errorText || `code ${e.errorCode}`;
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.candidate) {
          const parts = event.candidate.candidate.split(' ');
          const addr = parts[4];
          const typeIndex = parts.indexOf('typ');
          const candType = typeIndex >= 0 ? parts[typeIndex + 1] : '';
          if (addr && addr.endsWith('.local')) {
            mdns = true;
          } else if (candType === 'srflx' || candType === 'relay') {
            publics.add(addr);
          } else if (addr) {
            locals.add(addr);
          }
        } else if (!event.candidate && !settled) {
          settled = true;
          pc.close();
          if (stunError) {
            reject(new Error(stunError));
          } else {
            resolve({
              local: Array.from(locals),
              public: Array.from(publics),
              mdns,
            });
          }
        }
      };
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((e) => {
          if (!settled) {
            settled = true;
            pc.close();
            reject(e);
          }
        });

      setTimeout(() => {
        if (!settled) {
          settled = true;
          pc.close();
          if (stunError) {
            reject(new Error(stunError));
          } else {
            resolve({
              local: Array.from(locals),
              public: Array.from(publics),
              mdns,
            });
          }
        }
      }, STUN_TIMEOUT);
    } catch (err) {
      if (!settled) {
        settled = true;
        reject(err);
      }
    }
  });
};

export const testDns = async (hostnames: string[]): Promise<DnsResult[]> => {
  const resolvers = [
    { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
    { name: 'Google', url: 'https://dns.google/resolve' },
  ];

  const queries = [] as Promise<DnsResult>[];
  for (const host of hostnames) {
    for (const r of resolvers) {
      const q = fetch(`${r.url}?name=${encodeURIComponent(host)}&type=A`, {
        headers: { Accept: 'application/dns-json' },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const addresses =
            data.Answer?.map((a: any) => a.data as string) || [];
          return {
            hostname: host,
            resolver: r.name,
            addresses,
            error: addresses.length ? undefined : 'No records',
          } as DnsResult;
        })
        .catch((e: any) => ({
          hostname: host,
          resolver: r.name,
          addresses: [],
          error: e.message || 'Lookup failed',
        }));
      queries.push(q);
    }
  }

  return Promise.all(queries);
};

export const fetchPublicIps = async (): Promise<{
  ips: string[];
  errors: string[];
}> => {
  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://ipapi.co/json',
  ];
  const ips: string[] = [];
  const errors: string[] = [];
  await Promise.all(
    endpoints.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const ip = data.ip || data.IP;
        if (ip) ips.push(ip);
        else errors.push(`No IP from ${url}`);
      } catch (e: any) {
        const host = (() => {
          try {
            return new URL(url).hostname;
          } catch {
            return url;
          }
        })();
        errors.push(`Public IP error (${host}): ${e.message || 'failed'}`);
      }
    })
  );
  return { ips, errors };
};

export const utils = {
  gatherIps,
  testDns,
  fetchPublicIps,
};
type Props = {
  utils?: typeof utils;
};

const IpDnsLeak: React.FC<Props> = ({ utils: u = utils }) => {
  const [loading, setLoading] = useState(false);
  const [publicIps, setPublicIps] = useState<string[]>([]);
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [mdns, setMdns] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  } | null>(null);
  const [dnsInput, setDnsInput] = useState('example.com');
  const [dnsResults, setDnsResults] = useState<DnsResult[]>([]);
  const [resolverInfo, setResolverInfo] = useState<ResolverInfo[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    setErrors([]);
    setPublicIps([]);
    setLocalIps([]);
    setMdns(false);
    setNetworkInfo(null);
    setDnsResults([]);
    setResolverInfo([]);

    const hostnames = dnsInput
      .split(/\s+/)
      .map((h) => h.trim())
      .filter(Boolean);

    const errorList: string[] = [];

    const ipPromise = u.gatherIps().catch((e) => {
      errorList.push(`WebRTC/STUN error: ${e.message}`);
      return { local: [], public: [], mdns: false } as IpInfo;
    });
    const dnsPromise = u.testDns(hostnames).catch((e) => {
      errorList.push(`DNS test error: ${e.message}`);
      return [] as DnsResult[];
    });
    const resolverPromise = fetch('/api/ip-dns-leak')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((e) => {
        errorList.push(`Resolver probe error: ${e.message}`);
        return { resolvers: [] as ResolverInfo[] };
      });
    const pubIpPromise = u.fetchPublicIps();

    const [ipData, dns, resolverData, pubIps] = await Promise.all([
      ipPromise,
      dnsPromise,
      resolverPromise,
      pubIpPromise,
    ]);

    setLocalIps(ipData.local);
    setPublicIps(Array.from(new Set([...ipData.public, ...pubIps.ips])));
    setMdns(ipData.mdns);
    setDnsResults(dns);

    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (conn) {
      setNetworkInfo({
        type: conn.type,
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
      });
    }

    if (resolverData?.resolvers) {
      const ipSet = new Set([...ipData.local, ...ipData.public]);
      const enriched = resolverData.resolvers.map((r: ResolverInfo) => ({
        ...r,
        mismatch: r.ip ? !ipSet.has(r.ip) : true,
      }));
      setResolverInfo(enriched);
    }
    setErrors([...errorList, ...pubIps.errors]);
    setLoading(false);
  };

  const hasDnsErrors = dnsResults.some((r) => r.error);
  const resolverMismatch = resolverInfo.some((r) => r.mismatch);

  const summary: string[] = [];
  if (publicIps.length) summary.push(`Public IP detected: ${publicIps.join(', ')}`);
  if (localIps.length) summary.push(`Local IPs: ${localIps.join(', ')}`);
  if (dnsResults.length)
    summary.push(
      hasDnsErrors ? 'Some DNS lookups failed.' : 'DNS lookups succeeded.'
    );
  if (resolverInfo.length)
    summary.push(
      resolverMismatch
        ? 'Resolver IP mismatch detected.'
        : 'Resolvers match WebRTC candidates.'
    );
  if (mdns) summary.push('mDNS obfuscation detected.');
  if (networkInfo)
    summary.push(
      `Network: ${networkInfo.effectiveType || networkInfo.type}`
    );

  const tips: string[] = [];
  if (publicIps.length)
    tips.push('Use a VPN or proxy to mask your public IP.');
  if (localIps.length && !mdns)
    tips.push('Enable mDNS or disable WebRTC to prevent local IP disclosure.');
  if (hasDnsErrors)
    tips.push('Configure a secure DNS resolver or check for DNS leaks.');
  if (resolverMismatch)
    tips.push('Ensure DNS queries use your expected network/VPN.');

  const copyReport = async () => {
    const reportLines = [...summary];
    if (tips.length) {
      reportLines.push('', 'Remediation Tips:', ...tips);
    }
    try {
      await navigator.clipboard.writeText(reportLines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      setErrors((prev) => [...prev, `Copy failed: ${e.message}`]);
    }
  };

  return (
    <div className="h-full w-full bg-panel text-white p-4 overflow-auto space-y-4">
      <div className="text-yellow-300 text-sm">
        Browser APIs provide limited visibility into network settings. Results
        may be incomplete depending on your browser and extensions.
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-start">
        <textarea
          className="text-black px-2 py-1 flex-1 h-24"
          value={dnsInput}
          onChange={(e) => setDnsInput(e.target.value)}
          placeholder="Hostnames to test"
        />
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={runCheck}
          disabled={loading}
        >
          {loading ? 'Running...' : 'Run'}
        </button>
      </div>

      {errors.length > 0 && (
      <div className="text-red-400 space-y-1">
        {errors.map((e, i) => (
          <div key={i}>{e}</div>
        ))}
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={runCheck}
          disabled={loading}
        >
          Retry
        </button>
      </div>
      )}

      {publicIps.length > 0 && (
        <div>
          <strong>Public Candidates:</strong> {publicIps.join(', ')}
        </div>
      )}
      {localIps.length > 0 && (
        <div>
          <strong>Local Candidates:</strong> {localIps.join(', ')}
        </div>
      )}
      {mdns && (
        <div>
          <strong>mDNS:</strong> Obfuscation detected
        </div>
      )}
      {networkInfo && (
        <div>
          <strong>Network:</strong>{' '}
          {networkInfo.effectiveType || networkInfo.type}
          {typeof networkInfo.downlink === 'number' && (
            <> ({networkInfo.downlink}Mb/s)</>
          )}
          {typeof networkInfo.rtt === 'number' && (
            <> rtt {networkInfo.rtt}ms</>
          )}
        </div>
      )}

      {resolverInfo.length > 0 && (
        <table className="text-sm w-full">
          <thead>
            <tr>
              <th className="text-left">Transport</th>
              <th className="text-left">Resolver IP</th>
              <th className="text-left">ASN</th>
              <th className="text-left">Client IP</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {resolverInfo.map((r, i) => (
              <tr key={i}>
                <td>{r.transport}</td>
                <td>{r.resolver}</td>
                <td>{r.asn || 'Unknown'}</td>
                <td>{r.ip || (r.error ? 'n/a' : '')}</td>
                <td>
                  {r.error ? (
                    <span className="text-red-400">{r.error}</span>
                  ) : r.mismatch ? (
                    <span className="text-yellow-300">Mismatch</span>
                  ) : (
                    <span className="text-green-400">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dnsResults.length > 0 && (
        <table className="text-sm w-full">
          <thead>
            <tr>
              <th className="text-left">Hostname</th>
              <th className="text-left">Resolver</th>
              <th className="text-left">Result</th>
            </tr>
          </thead>
          <tbody>
            {dnsResults.map((r, i) => (
              <tr key={i}>
                <td>{r.hostname}</td>
                <td>{r.resolver}</td>
                <td>
                  {r.error
                    ? <span className="text-red-400">{r.error}</span>
                    : r.addresses.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {summary.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold">Risk Summary</div>
          <ul className="list-disc list-inside text-sm space-y-1">
            {summary.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {tips.length > 0 && (
            <div>
              <div className="font-semibold mt-2">Remediation Tips</div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={copyReport}
            disabled={copied}
          >
            {copied ? 'Copied!' : 'Copy Report'}
          </button>
        </div>
      )}
    </div>
  );
};

export default IpDnsLeak;
export const displayIpDnsLeak = () => <IpDnsLeak />;

