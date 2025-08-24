import React, { useState } from 'react';

type DnsResult = {
  hostname: string;
  resolver: string;
  addresses: string[];
  error?: string;
};

const STUN_TIMEOUT = 3000; // ms

async function fetchPublicIp(): Promise<string> {
  const res = await fetch('https://api64.ipify.org?format=json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.ip;
}

function gatherLocalIps(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const ips = new Set<string>();
    let settled = false;
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pc.createDataChannel('');
      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.candidate) {
          const parts = event.candidate.candidate.split(' ');
          if (parts[4]) ips.add(parts[4]);
        } else if (!event.candidate && !settled) {
          settled = true;
          pc.close();
          resolve(Array.from(ips));
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
          resolve(Array.from(ips));
        }
      }, STUN_TIMEOUT);
    } catch (err) {
      if (!settled) {
        settled = true;
        reject(err);
      }
    }
  });
}

async function testDns(hostnames: string[]): Promise<DnsResult[]> {
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
}

const IpDnsLeak: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [dnsInput, setDnsInput] = useState('example.com');
  const [dnsResults, setDnsResults] = useState<DnsResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const runCheck = async () => {
    setLoading(true);
    setErrors([]);
    setPublicIp(null);
    setLocalIps([]);
    setDnsResults([]);

    const hostnames = dnsInput
      .split(/\s+/)
      .map((h) => h.trim())
      .filter(Boolean);

    const errorList: string[] = [];

    const ipPromise = fetchPublicIp().catch((e) => {
      errorList.push(`Public IP error: ${e.message}`);
      return null;
    });
    const localPromise = gatherLocalIps().catch((e) => {
      errorList.push(`WebRTC error: ${e.message}`);
      return [] as string[];
    });
    const dnsPromise = testDns(hostnames).catch((e) => {
      errorList.push(`DNS test error: ${e.message}`);
      return [] as DnsResult[];
    });

    const [ip, local, dns] = await Promise.all([
      ipPromise,
      localPromise,
      dnsPromise,
    ]);

    if (ip) setPublicIp(ip);
    setLocalIps(local);
    setDnsResults(dns);
    setErrors(errorList);
    setLoading(false);
  };

  const hasDnsErrors = dnsResults.some((r) => r.error);

  const summary: string[] = [];
  if (publicIp) summary.push(`Public IP detected: ${publicIp}`);
  if (localIps.length) summary.push(`Local IPs: ${localIps.join(', ')}`);
  if (dnsResults.length)
    summary.push(
      hasDnsErrors ? 'Some DNS lookups failed.' : 'DNS lookups succeeded.'
    );

  const tips: string[] = [];
  if (publicIp)
    tips.push('Use a VPN or proxy to mask your public IP.');
  if (localIps.length)
    tips.push('Disable WebRTC to prevent local IP disclosure.');
  if (hasDnsErrors)
    tips.push('Configure a secure DNS resolver or check for DNS leaks.');

  return (
    <div className="h-full w-full bg-panel text-white p-4 overflow-auto space-y-4">
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
      </div>
      )}

      {publicIp && (
        <div>
          <strong>Public IP:</strong> {publicIp}
        </div>
      )}
      {localIps.length > 0 && (
        <div>
          <strong>Local Candidates:</strong> {localIps.join(', ')}
        </div>
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
        </div>
      )}
    </div>
  );
};

export default IpDnsLeak;
export const displayIpDnsLeak = () => <IpDnsLeak />;

