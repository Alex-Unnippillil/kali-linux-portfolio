import React, { useEffect, useRef, useState } from 'react';
import type { ScanResult } from './worker';

const MixedContent: React.FC = () => {
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    const worker = workerRef.current;
    worker.onmessage = (e: MessageEvent<ScanResult[]>) => {
      setResults(e.data);
    };
    return () => {
      worker.terminate();
    };
  }, []);

  const scan = () => {
    setError(null);
    setResults([]);
    workerRef.current?.postMessage(html);
  };

  const fetchAndScan = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`/api/mixed-content?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fetch failed');
      } else {
        setHtml(data.body);
        workerRef.current?.postMessage(data.body);
      }
    } catch (e) {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          className="p-2 text-black flex-1"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          onClick={fetchAndScan}
          disabled={loading || !url}
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Fetching...' : 'Fetch & Scan'}
        </button>
      </div>
      <textarea
        className="w-full h-40 text-black p-2"
        placeholder="Paste HTML here"
        value={html}
        onChange={(e) => setHtml(e.target.value)}
      />
      <div>
        <button
          type="button"
          onClick={scan}
          className="bg-green-600 px-4 py-2 rounded"
        >
          Scan Pasted HTML
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {results.length > 0 && (
        <div className="overflow-auto text-sm flex-1">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Tag</th>
                <th className="px-2 py-1 text-left">Attribute</th>
                <th className="px-2 py-1 text-left">HTTP URL</th>
                <th className="px-2 py-1 text-left">HTTPS Hint</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="odd:bg-gray-800">
                  <td className="px-2 py-1">{r.tag}</td>
                  <td className="px-2 py-1">{r.attr}</td>
                  <td className="px-2 py-1 break-all">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {r.url}
                    </a>
                  </td>
                  <td className="px-2 py-1 break-all">{r.httpsUrl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MixedContent;

