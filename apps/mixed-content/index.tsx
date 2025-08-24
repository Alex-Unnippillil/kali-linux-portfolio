import React, { useEffect, useRef, useState } from 'react';
import type { ScanResult } from './worker';

const MixedContent: React.FC = () => {
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rewritten, setRewritten] = useState('');
  const [simulateUpgrade, setSimulateUpgrade] = useState(false);
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
    const rewrittenHtml = html.replace(/http:\/\//gi, 'https://');
    setRewritten(rewrittenHtml);
    const toScan = simulateUpgrade ? rewrittenHtml : html;
    workerRef.current?.postMessage(toScan);
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
        const rewrittenHtml = data.body.replace(/http:\/\//gi, 'https://');
        setRewritten(rewrittenHtml);
        const toScan = simulateUpgrade ? rewrittenHtml : data.body;
        workerRef.current?.postMessage(toScan);
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
      <div className="flex items-center space-x-2">
        <input
          id="simulate-upgrade"
          type="checkbox"
          checked={simulateUpgrade}
          onChange={(e) => setSimulateUpgrade(e.target.checked)}
        />
        <label htmlFor="simulate-upgrade">Simulate upgrade-insecure-requests</label>
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
        <div className="overflow-auto text-sm flex-1 space-y-4">
          <div>
            <p>Active mixed content: {results.filter((r) => r.category === 'active').length}</p>
            <p>Passive mixed content: {results.filter((r) => r.category === 'passive').length}</p>
          </div>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Tag</th>
                <th className="px-2 py-1 text-left">Attribute</th>
                <th className="px-2 py-1 text-left">HTTP URL</th>
                <th className="px-2 py-1 text-left">HTTPS Hint</th>
                <th className="px-2 py-1 text-left">Suggestion</th>
                <th className="px-2 py-1 text-left">Category</th>
                <th className="px-2 py-1 text-left">Browser Note</th>
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
                  <td className="px-2 py-1 break-all">{r.suggestion}</td>
                  <td className="px-2 py-1">{r.category}</td>
                  <td className="px-2 py-1">
                    {r.category === 'active'
                      ? 'Blocked by modern browsers'
                      : 'Loaded with warnings'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <h2 className="font-bold mb-1">Suggested CSP Header</h2>
            <code className="block bg-gray-800 p-2 rounded">
              Content-Security-Policy: upgrade-insecure-requests; block-all-mixed-content
            </code>
          </div>

          <div>
            <h2 className="font-bold mb-1">Automatic Rewrite Preview</h2>
            <textarea
              className="w-full h-40 text-black p-2"
              value={rewritten}
              readOnly
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MixedContent;

