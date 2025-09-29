'use client';

import React, { useEffect, useRef, useState } from 'react';
import AuditSimulator from './components/AuditSimulator';
import type {
  RuleSimulationResult,
  SimulationProgress,
} from '../../modules/john/rule-sandbox';

interface HashItem {
  hash: string;
  progress: number;
  status: 'pending' | 'cracked' | 'failed';
  password?: string;
  strength?: 'weak' | 'medium' | 'strong';
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

const DEFAULT_BASE_WORDS = `password
letmein
summer2024`;

const DEFAULT_RULES = `:
c
$[0-9]
^!
d`;

const JohnApp: React.FC = () => {
  const [view, setView] = useState<'cracking' | 'sandbox'>('cracking');
  const [mode, setMode] = useState<'single' | 'incremental' | 'wordlist'>('wordlist');
  const [wordlist, setWordlist] = useState(DEFAULT_WORDLIST);
  const [singleValue, setSingleValue] = useState('password');
  const [incLength, setIncLength] = useState(3);
  const [running, setRunning] = useState(false);
  const [hashes, setHashes] = useState<HashItem[]>(initialHashes);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [eta, setEta] = useState('00:00');
  const [sandboxBase, setSandboxBase] = useState(DEFAULT_BASE_WORDS);
  const [sandboxRules, setSandboxRules] = useState(DEFAULT_RULES);
  const [sandboxResult, setSandboxResult] = useState<RuleSimulationResult | null>(null);
  const [sandboxProgress, setSandboxProgress] = useState<SimulationProgress | null>(null);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const activeJobRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

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
    setStartTime(Date.now());
    setEta('00:00');

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
              const pw = PASSWORDS[item.hash];
              item.status = 'cracked';
              item.password = pw;
              item.strength = getStrength(pw);
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

  const modes = [
    { key: 'single', label: 'Single' },
    { key: 'incremental', label: 'Incremental' },
    { key: 'wordlist', label: 'Wordlist' },
  ] as const;

  const getStrength = (pw: string): 'weak' | 'medium' | 'strong' => {
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    if (pw.length >= 10 && hasUpper && hasLower && hasNumber && hasSpecial)
      return 'strong';
    if (pw.length >= 6 && ((hasUpper && hasLower) || hasNumber)) return 'medium';
    return 'weak';
  };

  const strengthClass = {
    weak: 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200',
    medium: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
    strong: 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200',
  } as const;

  const overallProgress =
    hashes.reduce((sum, h) => sum + h.progress, 0) / hashes.length;

  useEffect(() => {
    if (!running || !startTime) return;
    const elapsed = (Date.now() - startTime) / 1000;
    if (overallProgress > 0) {
      const totalTime = elapsed / (overallProgress / 100);
      const remaining = Math.max(totalTime - elapsed, 0);
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      setEta(
        `${mins.toString().padStart(2, '0')}:${secs
          .toString()
          .padStart(2, '0')}`,
      );
    }
  }, [overallProgress, running, startTime]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const worker = new Worker(
      new URL('../../workers/john-rule-sandbox.worker.ts', import.meta.url)
    );
    workerRef.current = worker;
    const listener = (event: MessageEvent) => {
      const data = event.data as
        | { id: number; type: 'progress'; payload: SimulationProgress }
        | { id: number; type: 'result'; payload: RuleSimulationResult }
        | { id: number; type: 'error'; error: string };
      if (data.id !== activeJobRef.current) return;
      if (data.type === 'progress') {
        setSandboxProgress(data.payload);
      } else if (data.type === 'result') {
        setSandboxResult(data.payload);
        setSandboxRunning(false);
        setSandboxError(null);
        activeJobRef.current = null;
      } else if (data.type === 'error') {
        setSandboxError(data.error);
        setSandboxRunning(false);
        activeJobRef.current = null;
      }
    };
    worker.addEventListener('message', listener);

    return () => {
      worker.removeEventListener('message', listener);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const runSandboxSimulation = () => {
    const worker = workerRef.current;
    if (!worker) return;
    const baseWords = sandboxBase.split(/\r?\n/);
    const rules = sandboxRules.split(/\r?\n/);
    const jobId = requestIdRef.current + 1;
    requestIdRef.current = jobId;
    activeJobRef.current = jobId;
    setSandboxRunning(true);
    setSandboxResult(null);
    setSandboxError(null);
    setSandboxProgress(null);
    worker.postMessage({
      id: jobId,
      type: 'simulate',
      payload: { baseWords, rules },
    });
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col gap-4 overflow-y-auto">
      <p className="text-xs text-yellow-300">Demo only – simulated cracking.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('cracking')}
          className={`px-3 py-1 rounded-full text-sm border ${
            view === 'cracking'
              ? 'bg-blue-600 border-blue-500'
              : 'bg-gray-200 text-black border-gray-300 dark:bg-gray-700 dark:text-white'
          }`}
        >
          Cracking demo
        </button>
        <button
          type="button"
          onClick={() => setView('sandbox')}
          className={`px-3 py-1 rounded-full text-sm border ${
            view === 'sandbox'
              ? 'bg-blue-600 border-blue-500'
              : 'bg-gray-200 text-black border-gray-300 dark:bg-gray-700 dark:text-white'
          }`}
        >
          Rule sandbox
        </button>
      </div>

        {view === 'cracking' && (
          <div className="flex flex-col gap-4">
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

        <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded">
          <div className="w-full bg-gray-400 dark:bg-gray-600 rounded h-2">
            <div
              className="h-2 bg-blue-500 rounded"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="text-xs text-center mt-1">ETA: {eta}</div>
        </div>

        <ul className="space-y-1 font-mono">
          {hashes.map((h) => (
            <li
              key={h.hash}
              className="bg-gray-800 rounded px-2 h-9 flex items-center justify-between text-xs sm:text-sm"
            >
              <span className="truncate">{h.hash}</span>
              {h.status === 'cracked' ? (
                <div className="flex items-center gap-2">
                  <span className="truncate">{h.password}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      strengthClass[h.strength!]
                    }`}
                  >
                    {h.strength}
                  </span>
                </div>
              ) : h.status === 'failed' ? (
                <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200 text-xs">
                  Failed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-gray-500 text-gray-100 text-xs">
                  Pending
                </span>
              )}
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
      )}

      {view === 'sandbox' && (
        <div className="bg-gray-800 rounded p-4 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Rule sandbox</h2>
            <p className="text-xs text-gray-300">
              Enter a small base wordlist and a set of transformation rules to estimate how many candidates
              a campaign would generate. The calculation runs in a worker so you can experiment without
              blocking the UI.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="uppercase tracking-wide text-gray-300">Base words</span>
              <textarea
                value={sandboxBase}
                onChange={(event) => setSandboxBase(event.target.value)}
                className="min-h-[140px] rounded border border-gray-600 bg-gray-900 p-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="uppercase tracking-wide text-gray-300">Rule set</span>
              <textarea
                value={sandboxRules}
                onChange={(event) => setSandboxRules(event.target.value)}
                className="min-h-[140px] rounded border border-gray-600 bg-gray-900 p-2 text-white"
              />
              <span className="text-xs text-gray-400">
                Supported commands: <code>:</code> (identity), <code>c</code> (capitalize), <code>u</code>{' '}
                (uppercase), <code>l</code> (lowercase), <code>d</code> (duplicate), <code>^</code> and{' '}
                <code>$</code> for prefix/suffix, including ranges like <code>$[0-9]</code>.
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={runSandboxSimulation}
              disabled={sandboxRunning}
              className="px-4 py-1 rounded bg-blue-600 disabled:opacity-60"
            >
              {sandboxRunning ? 'Simulating…' : 'Estimate candidates'}
            </button>
            {sandboxProgress && (
              <span className="text-xs text-gray-300">
                {sandboxProgress.completed}/{sandboxProgress.total} rules processed
              </span>
            )}
            {sandboxError && <span className="text-xs text-red-400">{sandboxError}</span>}
          </div>
          {sandboxProgress && (
            <div className="bg-gray-700 rounded h-2 w-full overflow-hidden">
              <div
                className="bg-blue-500 h-2"
                style={{
                  width:
                    sandboxProgress.total === 0
                      ? '0%'
                      : `${Math.min(
                          100,
                          Math.round((sandboxProgress.completed / sandboxProgress.total) * 100)
                        )}%`,
                }}
              />
            </div>
          )}
          {sandboxResult && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm uppercase tracking-wide text-gray-300">Estimated total</span>
                <span className="text-xl font-semibold">
                  {sandboxResult.totalCandidates.toLocaleString()}
                </span>
              </div>
              <div className="bg-gray-900 rounded border border-gray-700 divide-y divide-gray-800">
                {sandboxResult.ruleBreakdown.map((entry) => (
                  <div key={entry.rule} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-mono text-gray-300">{entry.rule}</span>
                    <span>{entry.candidates.toLocaleString()}</span>
                  </div>
                ))}
                {sandboxResult.ruleBreakdown.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">No valid rules processed.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JohnApp;
