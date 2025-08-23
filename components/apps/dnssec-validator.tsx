import { useState } from 'react';

type Result = {
  ok: boolean;
  ad: number;
  cd: number;
  status: string;
};

function DnssecValidator() {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState('A');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    setError('');
    setResult(null);
    if (!domain.trim()) {
      setError('Domain is required');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ domain: domain.trim(), type: type.trim() });
      const res = await fetch(`/api/dnssec-validator?${params.toString()}`);
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-surface text-white flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 px-2 py-1 text-black rounded"
        />
        <input
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value.toUpperCase())}
          placeholder="A"
          className="w-24 px-2 py-1 text-black rounded"
        />
        <button
          onClick={validate}
          className="px-3 py-1 bg-highlight text-black rounded disabled:opacity-50"
          disabled={loading}
        >
          Validate
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {result && (
        <div className="space-y-1">
          <div>AD: {result.ad}</div>
          <div>CD: {result.cd}</div>
          <div>Status: {result.status}</div>
          {result.ok && result.ad === 1 && result.status === 'NOERROR' ? (
            <div className="text-green-400">DNSSEC validation successful</div>
          ) : (
            <div className="text-red-400">DNSSEC validation failed</div>
          )}
        </div>
      )}
    </div>
  );
}

export default DnssecValidator;

export const displayDnssecValidator = () => <DnssecValidator />;

