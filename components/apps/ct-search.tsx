import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Sct = { timestamp: string };

type Result = {
  certId: number;
  sans: string[];
  issuer: string;
  notBefore: string;
  notAfter: string;
  scts: Sct[];
};

type IssuerStat = { issuer: string; count: number };
type SeriesPoint = { date: string; count: number };

type ApiResponse = {
  results: Result[];
  issuerStats: IssuerStat[];
  timeSeries: SeriesPoint[];
  suspicious: string[];
};

const CtSearch: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [excludeExpired, setExcludeExpired] = useState(true);
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [issuerStats, setIssuerStats] = useState<IssuerStat[]>([]);
  const [timeSeries, setTimeSeries] = useState<SeriesPoint[]>([]);
  const [suspicious, setSuspicious] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, ApiResponse>>(new Map());
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!domain) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const key = `${domain}|${excludeExpired}|${uniqueOnly}`;
      if (cacheRef.current.has(key)) {
        const cached = cacheRef.current.get(key)!;
        setResults(cached.results);
        setIssuerStats(cached.issuerStats);
        setTimeSeries(cached.timeSeries);
        setSuspicious(cached.suspicious);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/ct-search?domain=${encodeURIComponent(domain)}&excludeExpired=${excludeExpired}&unique=${uniqueOnly}`
        );
        if (res.status === 429) {
          setError('Rate limit exceeded');
          setResults([]);
          setIssuerStats([]);
          setTimeSeries([]);
          setSuspicious([]);
        } else {
          const data: ApiResponse | { error: string } = await res.json();
          if (!res.ok || 'error' in data) {
            setError((data as any).error || 'Request failed');
            setResults([]);
            setIssuerStats([]);
            setTimeSeries([]);
            setSuspicious([]);
          } else {
            setResults(data.results);
            setIssuerStats(data.issuerStats);
            setTimeSeries(data.timeSeries);
            setSuspicious(data.suspicious);
            cacheRef.current.set(key, data);
          }
        }
      } catch (e: any) {
        setError(e.message || 'Request failed');
        setResults([]);
        setIssuerStats([]);
        setTimeSeries([]);
        setSuspicious([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [domain, excludeExpired, uniqueOnly]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4 overflow-hidden">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          className="px-2 py-1 rounded bg-gray-800 text-white"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={excludeExpired}
              onChange={(e) => setExcludeExpired(e.target.checked)}
            />
            Exclude expired
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={uniqueOnly}
              onChange={(e) => setUniqueOnly(e.target.checked)}
            />
            Unique subdomains
          </label>
        </div>
      </div>
      {loading && <div className="text-sm text-gray-400">Searching...</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {suspicious.length > 0 && (
        <div className="p-2 bg-yellow-900 text-yellow-200 rounded text-sm space-y-1">
          <div className="font-semibold">Warnings</div>
          <ul className="list-disc pl-4">
            {suspicious.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {timeSeries.length > 0 && (
        <div className="bg-gray-800 p-2 rounded">
          <Line
            data={{
              labels: timeSeries.map((t) => t.date),
              datasets: [
                {
                  label: 'Issuance',
                  data: timeSeries.map((t) => t.count),
                  borderColor: 'rgb(59,130,246)',
                  backgroundColor: 'rgba(59,130,246,0.5)',
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { x: { ticks: { color: 'white' } }, y: { ticks: { color: 'white' } } },
            }}
          />
        </div>
      )}
      {issuerStats.length > 0 && (
        <div className="bg-gray-800 p-2 rounded text-sm space-y-1">
          <div className="font-semibold">Issuers</div>
          {issuerStats.map((i) => (
            <div key={i.issuer} className="flex justify-between">
              <span className="break-words pr-2">{i.issuer}</span>
              <span>{i.count}</span>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-auto h-full space-y-2 pr-1">
        {results.map((r) => (
          <div key={r.certId} className="p-2 bg-gray-800 rounded space-y-1">
            <div className="font-mono break-words text-sm">
              {r.sans.map((s) => (
                <div key={s}>{s}</div>
              ))}
            </div>
            <div className="text-xs text-gray-300 break-words">{r.issuer}</div>
            <div className="text-xs text-gray-400">
              {new Date(r.notBefore).toLocaleString()} -{' '}
              {new Date(r.notAfter).toLocaleString()}
            </div>
            {r.scts.length > 0 && (
              <div className="text-xs text-gray-500">
                {r.scts.map((s) => (
                  <div key={s.timestamp}>SCT: {new Date(s.timestamp).toLocaleString()}</div>
                ))}
              </div>
            )}
            <a
              href={`https://crt.sh/?id=${r.certId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 underline"
            >
              View certificate
            </a>
          </div>
        ))}
        {!loading && results.length === 0 && !error && (
          <div className="text-sm text-gray-400">No results</div>
        )}
      </div>
    </div>
  );
};

export default CtSearch;

export const displayCtSearch = () => <CtSearch />;
