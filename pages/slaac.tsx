import { useState } from 'react';
import Head from 'next/head';
import { parseSlaac, hasPrivacyExtensions, SlaacResult } from '../lib/slaac';
import { z } from 'zod';

const inputSchema = z.string().min(1, 'Input is required');

export default function SlaacPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<SlaacResult | null>(null);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInput(String(reader.result));
    reader.readAsText(file);
  };

  const analyze = () => {
    const check = inputSchema.safeParse(input);
    if (!check.success) {
      setError(check.error.issues[0].message);
      setResult(null);
      return;
    }
    setError('');
    const res = parseSlaac(input);
    setResult(res);
  };

  return (
    <>
      <Head>
        <title>SLAAC Analyzer</title>
        <meta
          name="description"
          content="Detect SLAAC patterns and privacy extensions from neighbor discovery logs."
        />
      </Head>
      <div className="p-4">
        <h1 className="text-2xl mb-2 flex items-center gap-2">
          <img src="/images/slaac.svg" alt="" className="h-6 w-6" /> SLAAC Analyzer
        </h1>
        <input
          type="file"
          accept=".txt,.log"
          onChange={handleFile}
          className="mb-2"
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full border p-2 h-40"
          placeholder="Paste neighbor discovery capture or config sample"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button
          onClick={analyze}
          className="mt-2 px-4 py-1 bg-blue-600 text-white rounded"
        >
          Analyze
        </button>
        {result && (
          <div className="mt-4">
            <h2 className="text-xl mb-2">Timeline</h2>
            <ul className="border-l border-gray-400 pl-4">
              {result.events.map((ev, i) => (
                <li key={i} className="mb-2">
                  <span className="font-mono">{ev.time}</span> - {ev.type}
                </li>
              ))}
            </ul>
            <h2 className="text-xl mt-4">Privacy Extension</h2>
            {hasPrivacyExtensions(result) ? (
              <p>
                Temporary addresses detected; privacy extensions appear enabled.
              </p>
            ) : (
              <p>
                Found EUI-64 addresses. Enable IPv6 privacy extensions to avoid
                tracking.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
