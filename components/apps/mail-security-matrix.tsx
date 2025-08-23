import React, { useState } from 'react';

type DnsResponse = {
  Answer?: { data: string }[];
  [key: string]: any;
};

type ApiResponse = {
  caa: DnsResponse;
  mx: DnsResponse;
  mtaSts: DnsResponse;
  error?: string;
};

const MailSecurityMatrix: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [hsts, setHsts] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mail-security-matrix?domain=${domain}`);
      const dnsData = await res.json();
      setData(dnsData);
      const hstsRes = await fetch(`/api/headers?url=https://${domain}`);
      const hstsJson = await hstsRes.json();
      const hstsHeader = hstsJson.results?.find(
        (r: any) => r.header === 'Strict-Transport-Security'
      );
      setHsts(hstsHeader?.grade === 'A' ? 'Present' : 'Missing');
    } catch (e) {
      setData({ caa: {}, mx: {}, mtaSts: {}, error: 'Lookup failed' });
    } finally {
      setLoading(false);
    }
  };

  const issuers =
    data?.caa?.Answer?.map((a) =>
      String(a.data).split(' ')[2]?.replace(/"/g, '') || a.data
    ) || [];
  const mxHosts =
    data?.mx?.Answer?.map((a) =>
      String(a.data).split(' ').pop()?.replace(/\.$/, '') || a.data
    ) || [];
  const mtaStsStatus = data?.mtaSts?.Answer ? 'Present' : 'Missing';

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="px-2 py-1 rounded bg-gray-800 text-white flex-1"
          placeholder="domain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <button
          type="button"
          onClick={check}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {data && !data.error && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pb-2">Check</th>
              <th className="pb-2">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-700">
              <td className="py-2 font-semibold">CAA Issuers</td>
              <td className="py-2">{issuers.length ? issuers.join(', ') : 'None'}</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="py-2 font-semibold">MX Hosts</td>
              <td className="py-2">{mxHosts.length ? mxHosts.join(', ') : 'None'}</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="py-2 font-semibold">MTA-STS</td>
              <td className="py-2">{mtaStsStatus}</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="py-2 font-semibold">Web HSTS</td>
              <td className="py-2">{hsts ?? 'Unknown'}</td>
            </tr>
          </tbody>
        </table>
      )}
      {data?.error && <div className="text-red-400">{data.error}</div>}
    </div>
  );
};

export default MailSecurityMatrix;

