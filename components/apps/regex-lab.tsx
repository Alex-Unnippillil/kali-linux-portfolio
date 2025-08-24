import React, { useEffect, useMemo, useRef, useState } from 'react';

const CAPABILITIES = [
  { feature: 'Lookbehind', re2: false, pcre: true },
  { feature: 'Backreferences', re2: false, pcre: true },
  { feature: 'Named capture groups', re2: true, pcre: true },
  { feature: 'Atomic groups', re2: false, pcre: true },
];


export default function RegexLab() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('');
  const [text, setText] = useState('');
  const [engine, setEngine] = useState<'re2' | 'pcre'>('re2');
  const [matches, setMatches] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Load state from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setPattern(params.get('pattern') || '');
    setFlags(params.get('flags') || '');
    setText(params.get('text') || '');
    setEngine((params.get('engine') as 're2' | 'pcre') || 're2');
  }, []);

  // Post work to Web Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./regex-lab.worker.ts', import.meta.url));
    }
    const worker = workerRef.current;
    const textBuffer = new TextEncoder().encode(text).buffer;
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as { match?: string[]; error?: string; index?: number; tip?: string };
      if (data.error) {
        setError(data.error + (data.index !== undefined ? ` at position ${data.index}` : ''));
        setTip(data.tip || null);
        setMatches(null);
      } else {
        setMatches(data.match || null);
        setError(null);
        setTip(null);
      }
    };
    worker.postMessage({ engine, pattern, flags, textBuffer });
  }, [pattern, flags, text, engine]);

  const share = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?pattern=${encodeURIComponent(
      pattern,
    )}&flags=${encodeURIComponent(flags)}&text=${encodeURIComponent(text)}&engine=${engine}`;
    navigator.clipboard.writeText(url);
    alert('Permalink copied to clipboard');
  };

  const capabilityDiff = useMemo(() => {
    return (
      <table className="mt-4 text-sm">
        <thead>
          <tr>
            <th className="px-2 text-left">Feature</th>
            <th className="px-2">RE2</th>
            <th className="px-2">PCRE2</th>
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((c) => (
            <tr key={c.feature}>
              <td className="px-2">{c.feature}</td>
              <td className="px-2 text-center">{c.re2 ? '✓' : '✗'}</td>
              <td className="px-2 text-center">{c.pcre ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, []);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="px-2 py-1 rounded text-black"
          placeholder="Pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <input
          className="px-2 py-1 w-20 rounded text-black"
          placeholder="Flags"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
        />
        <select
          className="px-2 py-1 rounded text-black"
          value={engine}
          onChange={(e) => setEngine(e.target.value as 're2' | 'pcre')}
        >
          <option value="re2">RE2</option>
          <option value="pcre">PCRE2</option>
        </select>
        <button className="px-3 py-1 bg-blue-600 rounded" onClick={share}>
          Share
        </button>
      </div>
      <textarea
        className="w-full h-40 p-2 rounded text-black"
        placeholder="Sample text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex-1 overflow-auto bg-gray-800 p-2 rounded">
        {error && <div className="text-red-400">{error}</div>}
        {tip && <div className="text-yellow-400 text-sm">{tip}</div>}
        {matches && (
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(matches, null, 2)}</pre>
        )}
      </div>
      {capabilityDiff}
    </div>
  );
}

export const displayRegexLab = () => <RegexLab />;
