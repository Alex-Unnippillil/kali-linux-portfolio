'use client';
import React, { useEffect, useRef, useState } from 'react';
import safeRegex from 'safe-regex';

type EngineResult = {
  compileTime: number | null;
  matchTime: number | null;
  match: string[] | null;
  error: string | null;
};

export default function PcreRe2Lab() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('');
  const [text, setText] = useState('');
  const [pcre, setPcre] = useState<EngineResult | null>(null);
  const [re2, setRe2] = useState<EngineResult | null>(null);
  const [isSafe, setIsSafe] = useState(true);

  const workerRef = useRef<Worker | null>(null);

  // Load state from URL or localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const storedPattern =
      params.get('pattern') || localStorage.getItem('pcreRe2Pattern') || '';
    const storedFlags =
      params.get('flags') || localStorage.getItem('pcreRe2Flags') || '';
    const storedText =
      params.get('text') || localStorage.getItem('pcreRe2Text') || '';
    setPattern(storedPattern);
    setFlags(storedFlags);
    setText(storedText);
  }, []);

  // Persist state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pcreRe2Pattern', pattern);
    localStorage.setItem('pcreRe2Flags', flags);
    localStorage.setItem('pcreRe2Text', text);
  }, [pattern, flags, text]);

  // Evaluate
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsSafe(safeRegex(pattern));
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./pcre-re2-lab.worker.ts', import.meta.url));
    }
    const worker = workerRef.current;
    const textBuffer = new TextEncoder().encode(text).buffer;
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as { pcre: EngineResult; re2: EngineResult };
      if (data.pcre) setPcre(data.pcre);
      if (data.re2) setRe2(data.re2);
    };
    worker.postMessage({ pattern, flags, textBuffer });
  }, [pattern, flags, text]);

  const canned = [
    {
      label: 'Email',
      pattern: '([\\w.-]+)@([\\w.-]+)\\.([a-zA-Z]{2,})',
      text: 'contact me at foo@example.com',
    },
    {
      label: 'IPv4',
      pattern: '(\\d{1,3}(?:\\.\\d{1,3}){3})',
      text: 'The IP is 192.168.0.1',
    },
    {
      label: 'Catastrophic',
      pattern: '(a+)+$',
      text: 'aaaaaaaaaaaaaaaaaaaa!'
    },
  ];

  const share = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?pattern=${encodeURIComponent(
      pattern,
    )}&flags=${encodeURIComponent(flags)}&text=${encodeURIComponent(text)}`;
    navigator.clipboard.writeText(url);
    alert('Permalink copied to clipboard');
  };

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
        <button className="px-3 py-1 bg-blue-600 rounded" onClick={share}>
          Share
        </button>
        <div
          className={`px-2 py-1 rounded text-sm ${
            isSafe ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {isSafe ? 'Safe' : 'Unsafe'}
        </div>
      </div>
      <textarea
        className="w-full h-40 p-2 rounded text-black"
        placeholder="Sample text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[250px] bg-gray-800 p-2 rounded">
          <h2 className="font-bold mb-2">PCRE2</h2>
          {pcre?.error && <div className="text-red-400 text-sm">{pcre.error}</div>}
          {pcre && !pcre.error && (
            <div className="text-sm">
              <div>Compile: {pcre.compileTime?.toFixed(2)}ms</div>
              <div>Match: {pcre.matchTime?.toFixed(2)}ms</div>
              {pcre.match && (
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(pcre.match, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-[250px] bg-gray-800 p-2 rounded">
          <h2 className="font-bold mb-2">RE2</h2>
          {re2?.error && <div className="text-red-400 text-sm">{re2.error}</div>}
          {re2 && !re2.error && (
            <div className="text-sm">
              <div>Compile: {re2.compileTime?.toFixed(2)}ms</div>
              <div>Match: {re2.matchTime?.toFixed(2)}ms</div>
              {re2.match && (
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(re2.match, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mt-2">
        {canned.map((c) => (
          <button
            key={c.label}
            className="px-2 py-1 bg-gray-700 rounded text-sm"
            onClick={() => {
              setPattern(c.pattern);
              setText(c.text);
              setFlags('');
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const displayPcreRe2Lab = () => <PcreRe2Lab />;
