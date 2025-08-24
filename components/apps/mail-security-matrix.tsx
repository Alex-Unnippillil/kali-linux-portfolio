import React, { useState } from 'react';

type DnsAnswer = { data: string };
type DnsResponse = { Answer?: DnsAnswer[]; error?: string };

type ApiResponse = {
  mx?: DnsResponse;
  mtaSts?: DnsResponse;
  tlsRpt?: DnsResponse;
  dane?: Record<string, DnsResponse>;
  errors?: Record<string, string>;
};

const MailSecurityMatrix: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mail-security-matrix?domain=${domain}`);
      const dnsData = await res.json();
      setData(dnsData);
    } catch (e) {
      setData({ errors: { general: 'Lookup failed' } });
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  const mtaStsStatus = data?.mtaSts?.Answer ? 'Present' : 'Missing';
  const tlsRptStatus = data?.tlsRpt?.Answer ? 'Present' : 'Missing';
  const daneHosts = Object.entries(data?.dane || {});
  const daneStatus = daneHosts.some(([_, r]) => r.Answer) ? 'Present' : 'Missing';

  const recommendedMtaSts = `_mta-sts.${domain}. IN TXT "v=STSv1; id=1"\n# https://mta-sts.${domain}/.well-known/mta-sts.txt\nversion: STSv1\nmode: enforce\nmx: mail.${domain}\nmax_age: 604800`;
  const recommendedTlsRpt = `_smtp._tls.${domain}. IN TXT "v=TLSRPTv1; rua=mailto:tlsrpt@${domain}"`;
  const recommendedDane = `_25._tcp.mail.${domain}. IN TLSA 3 1 1 <CERT_SHA256_HASH>`;

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
      {data && !data.errors?.general && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pb-2">Check</th>
              <th className="pb-2">Result</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-700">
              <td className="py-2 font-semibold">MTA-STS</td>
              <td className="py-2">
                {mtaStsStatus}
                {data?.errors?.mtaSts ? ` (${data.errors.mtaSts})` : ''}
              </td>
              <td className="py-2">
                <button
                  className="px-2 py-1 bg-gray-700 rounded"
                  onClick={() => copy(recommendedMtaSts)}
                >
                  Copy
                </button>
              </td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="py-2 font-semibold">TLS-RPT</td>
              <td className="py-2">
                {tlsRptStatus}
                {data?.errors?.tlsRpt ? ` (${data.errors.tlsRpt})` : ''}
              </td>
              <td className="py-2">
                <button
                  className="px-2 py-1 bg-gray-700 rounded"
                  onClick={() => copy(recommendedTlsRpt)}
                >
                  Copy
                </button>
              </td>
            </tr>
            <tr className="border-t border-gray-700">
              <td className="py-2 font-semibold">DANE</td>
              <td className="py-2">
                {daneStatus}
                {data?.errors?.dane && ` (${data.errors.dane})`}
                {!data?.errors?.dane &&
                  daneHosts.map(([host, r]) =>
                    r.error ? ` (${host}: ${r.error})` : ''
                  )}
              </td>
              <td className="py-2">
                <button
                  className="px-2 py-1 bg-gray-700 rounded"
                  onClick={() => copy(recommendedDane)}
                >
                  Copy
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}
      {data?.errors?.general && (
        <div className="text-red-400">{data.errors.general}</div>
      )}
    </div>
  );
};

export default MailSecurityMatrix;

