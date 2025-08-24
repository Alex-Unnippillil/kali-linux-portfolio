'use client';

import React, { useEffect, useRef, useState } from 'react';
import safeRegex from 'safe-regex';

const MAX_LEN = 1000;

interface Example {
  pattern: string;
  text: string;
  explanation: string;
}

const examples: Example[] = [
  {
    pattern: '^(a+)+$',
    text: 'aaaaaaaaaaaaaaaaaaaa!',
    explanation: 'Nested quantifiers cause catastrophic backtracking.',
  },
  {
    pattern: '(a|aa)+$',
    text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
    explanation: 'Ambiguous alternation triggers extensive backtracking.',
  },
];

const PcreRe2Lab: React.FC = () => {
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [pcreTime, setPcreTime] = useState(0);
  const [re2Time, setRe2Time] = useState(0);
  const [pcreResult, setPcreResult] = useState<string | null>(null);
  const [re2Result, setRe2Result] = useState<string | null>(null);
  const [heat, setHeat] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const [unsafe, setUnsafe] = useState(false);
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL('./pcre2-worker.ts', import.meta.url));
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { matches, time, error, heat } = e.data;
      setPcreTime(time);
      setPcreResult(matches ? JSON.stringify(matches) : 'null');
      setHeat(heat || []);
      if (error) setMsg((m) => m + ` PCRE2: ${error}`);
    };
    return () => workerRef.current?.terminate();
  }, []);

  const run = () => {
    const limited = text.slice(0, MAX_LEN);
    if (limited !== text) setText(limited);
    setMsg('');
    setPcreResult(null);
    setRe2Result(null);
    workerRef.current?.postMessage({ pattern, text: limited });

    fetch('/api/pcre-re2-lab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern, text: limited }),
    }).then((res) => {
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';
      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.event === 'result') {
                setRe2Time(data.time || 0);
                setRe2Result(
                  data.matches ? JSON.stringify(data.matches) : 'null'
                );
                if (data.error) setMsg((m) => m + ` RE2: ${data.error}`);
              }
            }
          }
          read();
        });
      };
      read();
    });

    setUnsafe(!safeRegex(pattern));
  };

  useEffect(() => {
    const cb = () => run();
    const id =
      (window as any).requestIdleCallback
        ? (window as any).requestIdleCallback(cb)
        : setTimeout(cb, 0);
    return () => {
      if ((window as any).cancelIdleCallback) {
        (window as any).cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };
  }, [pattern, text]);

  const rewriteUnsafe = () => {
    let p = pattern;
    p = p.replace(/\(\?<=.*?\)/g, '').replace(/\(\?<!.*?\)/g, '');
    p = p.replace(/\\\d+/g, '');
    setPattern(p);
  };

  const maxHeat = heat.length ? Math.max(...heat) : 0;
  const heatColor = (v: number) => {
    if (!maxHeat) return 'transparent';
    const intensity = v / maxHeat;
    return `rgba(255,0,0,${intensity})`;
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col space-y-2">
      <div className="flex space-x-2 items-center">
        <input
          className="flex-1 px-2 py-1 text-black rounded"
          placeholder="Pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        {unsafe && (
          <button
            className="px-2 py-1 bg-yellow-600 rounded"
            onClick={rewriteUnsafe}
          >
            Safe rewrite
          </button>
        )}
      </div>
      <div className="relative">
        <textarea
          className="w-full h-32 p-2 text-black rounded font-mono"
          placeholder="Test text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
        />
        {heat.length > 0 && (
          <pre className="pointer-events-none absolute top-0 left-0 w-full h-32 p-2 whitespace-pre-wrap font-mono text-transparent">
            {text.split('').map((ch, i) => (
              <span
                key={i}
                style={{ backgroundColor: heatColor(heat[i] || 0) }}
              >
                {ch || ' '}
              </span>
            ))}
          </pre>
        )}
      </div>
      {msg && <div className="text-red-500 whitespace-pre-wrap">{msg}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-auto">
        <div>
          <h3 className="font-bold">PCRE2 (WASM)</h3>
          <div>Time: {pcreTime.toFixed(3)} ms</div>
          <pre className="bg-gray-800 p-2 rounded overflow-auto whitespace-pre-wrap">
            {pcreResult}
          </pre>
        </div>
        <div>
          <h3 className="font-bold">RE2 (server)</h3>
          <div>Time: {re2Time.toFixed(3)} ms</div>
          <pre className="bg-gray-800 p-2 rounded overflow-auto whitespace-pre-wrap">
            {re2Result}
          </pre>
        </div>
      </div>
      <details className="bg-gray-800 p-2 rounded">
        <summary className="cursor-pointer">ReDoS examples</summary>
        <ul className="space-y-1 mt-2">
          {examples.map((ex, i) => (
            <li key={i}>
              <button
                className="underline text-blue-400"
                onClick={() => {
                  setPattern(ex.pattern);
                  setText(ex.text);
                }}
              >
                {ex.pattern}
              </button>{' '}
              - {ex.explanation}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
};

export default PcreRe2Lab;

export const displayPcreRe2Lab = () => <PcreRe2Lab />;
