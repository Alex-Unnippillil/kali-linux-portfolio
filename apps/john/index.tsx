'use client';

import React, { useEffect, useState } from 'react';
import AuditSimulator from './components/AuditSimulator';

interface HashItem {
  hash: string;
  progress: number;
  status: 'pending' | 'cracked' | 'failed';
  password?: string;
}

const PASSWORDS: Record<string, string> = {
  '5f4dcc3b5aa765d61d8327deb882cf99': 'password',
  'e10adc3949ba59abbe56e057f20f883e': '123456',
};

const DEFAULT_WORDLIST = `password
123456
letmein
admin
welcome`;

const initialHashes: HashItem[] = Object.keys(PASSWORDS)
  .concat(['ffffffffffffffffffffffffffffffff'])
  .map((hash) => ({ hash, progress: 0, status: 'pending' }));

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
  const [mode, setMode] = useState<'single' | 'incremental' | 'wordlist'>('wordlist');
  const [wordlist, setWordlist] = useState(DEFAULT_WORDLIST);
  const [singleValue, setSingleValue] = useState('password');
  const [incLength, setIncLength] = useState(3);
  const [running, setRunning] = useState(false);
  const [hashes, setHashes] = useState<HashItem[]>(initialHashes);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const start = () => {
    const candidates =
      mode === 'wordlist'
        ? wordlist.split(/\r?\n/).filter(Boolean)
        : mode === 'incremental'
        ? generateIncremental(incLength)
        : [singleValue];

    setHashes(initialHashes.map((h) => ({ ...h }))); // reset
    setMessage(null);
    setRunning(true);

    const step = Math.max(1, Math.floor(100 / candidates.length));
    const intervals: NodeJS.Timeout[] = [];

    initialHashes.forEach((_, idx) => {
      intervals[idx] = setInterval(() => {
        setHashes((prev) => {
          const next = [...prev];
          const item = next[idx];
          if (item.status !== 'pending') {
            clearInterval(intervals[idx]);
            return next;
          }
          item.progress = Math.min(item.progress + step, 100);
          if (item.progress === 100) {
            if (PASSWORDS[item.hash]) {
              item.status = 'cracked';
              item.password = PASSWORDS[item.hash];
            } else {
              item.status = 'failed';
            }
            clearInterval(intervals[idx]);
          }
          return next;
        });
      }, 300);
    });
  };

  useEffect(() => {
    if (!running) return;
    if (hashes.every((h) => h.status !== 'pending')) {
      setRunning(false);
      const allCracked = hashes.every((h) => h.status === 'cracked');
      setMessage({
        type: allCracked ? 'success' : 'error',
        text: allCracked ? 'All hashes cracked.' : 'Some hashes failed to crack.',
      });
    }
  }, [hashes, running]);

  const downloadResult = (item: HashItem) => {
    const text = `${item.hash}:${item.password}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.hash}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modes = [
    { key: 'single', label: 'Single' },
    { key: 'incremental', label: 'Incremental' },
    { key: 'wordlist', label: 'Wordlist' },
  ] as const;

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col gap-4">
      <p className="text-xs text-yellow-300">Demo only – simulated cracking.</p>
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`px-2 py-1 rounded-full border text-sm ${
                mode === m.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-black dark:bg-gray-700 dark:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'single' && (
          <input
            type="text"
            value={singleValue}
            onChange={(e) => setSingleValue(e.target.value)}
            className="text-black px-2 py-1 rounded"
            aria-label="Single candidate"
          />
        )}
        {mode === 'wordlist' && (
          <textarea
            value={wordlist}
            onChange={(e) => setWordlist(e.target.value)}
            className="flex-1 text-black p-1 rounded min-h-[80px]"
            aria-label="Wordlist"
          />
        )}
        {mode === 'incremental' && (
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
          className="px-4 py-1 bg-blue-600 rounded"
        >
          Start
        </button>
      </div>

      <ul className="space-y-2">
        {hashes.map((h) => (
          <li key={h.hash} className="bg-gray-800 p-2 rounded">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="font-mono text-xs sm:text-sm">{h.hash}</span>
              {h.status === 'cracked' && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
                    Cracked
                  </span>
                  <span className="font-mono">{h.password}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(h.password!)}
                    className="underline text-blue-400"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadResult(h)}
                    className="underline text-blue-400"
                  >
                    Download
                  </button>
                </div>
              )}
              {h.status === 'failed' && (
                <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200 text-xs">
                  Failed
                </span>
              )}
            </div>
            <div className="w-full bg-gray-700 rounded h-2 mt-1">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${h.progress}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      {message && (
        <div
          className={`p-2 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
              : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <AuditSimulator />
    </div>
  );
};

export default JohnApp;

