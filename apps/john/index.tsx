'use client';

import React, { useEffect, useRef, useState } from 'react';
import MaskBuilder from './components/MaskBuilder';

interface PotEntry {
  hash: string;
  password: string;
}

const DEFAULT_WORDLIST = `password
123456
letmein
admin
welcome`;

const samplePot: PotEntry[] = [
  { hash: '5f4dcc3b5aa765d61d8327deb882cf99', password: 'password' },
  { hash: 'e10adc3949ba59abbe56e057f20f883e', password: '123456' },
];

const generateIncremental = (length: number, limit = 100) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const results: string[] = [];
  const helper = (prefix: string) => {
    if (results.length >= limit) return;
    if (prefix.length === length) {
      results.push(prefix);
      return;
    }
    for (const c of chars) {
      helper(prefix + c);
      if (results.length >= limit) break;
    }
  };
  helper('');
  return results;
};

const JohnApp: React.FC = () => {
  const [mode, setMode] = useState<'wordlist' | 'incremental'>('wordlist');
  const [wordlist, setWordlist] = useState(DEFAULT_WORDLIST);
  const [incLength, setIncLength] = useState(3);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(0);
  const [running, setRunning] = useState(false);
  const [pot, setPot] = useState<PotEntry[]>(samplePot);
  const [filter, setFilter] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return undefined;
    const total = 15000; // 15s total simulated runtime
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const fraction = Math.min(elapsed / total, 1);
      const eased = 1 - Math.pow(1 - fraction, 3);
      const pct = Math.round(eased * 100);
      setProgress(pct);
      const remaining = total - elapsed;
      setEta(Math.max(0, remaining));
      setIndex((i) => (i + 1) % candidates.length);
      if (fraction >= 1) {
        clearInterval(intervalRef.current!);
        setRunning(false);
      }
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, candidates.length]);

  const start = () => {
    const list =
      mode === 'wordlist'
        ? wordlist.split(/\r?\n/).filter(Boolean)
        : generateIncremental(incLength);
    setCandidates(list.length ? list : ['']);
    setIndex(0);
    setProgress(0);
    setRunning(true);
  };

  const exportPot = () => {
    const text = pot.map((p) => `${p.hash}:${p.password}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'john.pot';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPot = pot.filter(
    (p) =>
      p.hash.toLowerCase().includes(filter.toLowerCase()) ||
      p.password.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col gap-4">
      <p className="text-xs text-yellow-300">Demo only – simulated cracking.</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <label className="flex items-center gap-2">
          Mode:
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'wordlist' | 'incremental')}
            className="text-black px-1 py-0.5 rounded"
          >
            <option value="wordlist">Wordlist</option>
            <option value="incremental">Incremental</option>
          </select>
        </label>
        {mode === 'wordlist' ? (
          <textarea
            value={wordlist}
            onChange={(e) => setWordlist(e.target.value)}
            className="flex-1 text-black p-1 rounded min-h-[80px]"
            aria-label="Wordlist"
          />
        ) : (
          <label className="flex items-center gap-2">
            Length:
            <input
              type="number"
              min={1}
              max={5}
              value={incLength}
              onChange={(e) => setIncLength(parseInt(e.target.value, 10) || 1)}
              className="w-16 text-black px-1 py-0.5 rounded"
            />
          </label>
        )}
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="px-4 py-1 bg-blue-600 rounded self-start"
        >
          Start
        </button>
      </div>
      {running && (
        <div>
          <div className="w-full bg-gray-700 rounded h-4 overflow-hidden">
            <div
              className="h-full bg-green-600"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-1">
            {progress}% – ETA: {(eta / 1000).toFixed(1)}s
          </p>
        </div>
      )}
      {!running && progress === 100 && (
        <p className="text-green-400 text-sm">Cracking complete.</p>
      )}
      <div>
        <h2 className="text-lg mb-1">Candidate Preview</h2>
        {candidates.length > 0 && (
          <p className="font-mono bg-black p-2 rounded h-24 overflow-auto">
            {candidates.slice(index, index + 5).join('\n')}
          </p>
        )}
      </div>
      <MaskBuilder />
      <div className="mt-auto">
        <h2 className="text-lg mb-1">Potfile</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-black px-2 py-1 rounded flex-1"
          />
          <button
            type="button"
            onClick={exportPot}
            className="px-3 py-1 bg-blue-700 rounded"
          >
            Export
          </button>
        </div>
        <ul className="bg-black p-2 rounded h-32 overflow-auto font-mono text-sm">
          {filteredPot.map((p) => (
            <li key={p.hash}>{`${p.hash}:${p.password}`}</li>
          ))}
          {filteredPot.length === 0 && <li>No entries</li>}
        </ul>
      </div>
    </div>
  );
};

export default JohnApp;

