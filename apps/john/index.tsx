'use client';

import React, { useEffect, useState } from 'react';
import AuditSimulator from './components/AuditSimulator';
import johnPlaceholders from '../../components/apps/john/placeholders';
import LabMode from '../../components/LabMode';
import LabPanels from './components/LabPanels';
import { useLabFixtures } from './lib/fixtures';

interface HashItem {
  hash: string;
  progress: number;
  status: 'pending' | 'cracked' | 'failed';
  password?: string;
  strength?: 'weak' | 'medium' | 'strong';
}

const PASSWORDS: Record<string, string> = johnPlaceholders.hashedPasswords.reduce(
  (acc, item) => {
    acc[item.hash] = item.plaintext;
    return acc;
  },
  {} as Record<string, string>
);

const DEFAULT_WORDLIST = johnPlaceholders.defaultWordlist.join('\n');

const HINTS = [
  'Pair the format flag with the sample hashes before running.',
  'Switch to incremental mode when the curated lists stall.',
  'Audit the weak-password report to plan new wordlists.',
];

const initialHashes: HashItem[] = johnPlaceholders.hashedPasswords
  .map((item) => item.hash)
  .concat([johnPlaceholders.fallbackHash])
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
  const fixtures = useLabFixtures();
  const [mode, setMode] = useState<'single' | 'incremental' | 'wordlist'>('wordlist');
  const [wordlist, setWordlist] = useState(DEFAULT_WORDLIST);
  const [singleValue, setSingleValue] = useState('password');
  const [incLength, setIncLength] = useState(3);
  const [running, setRunning] = useState(false);
  const [hashes, setHashes] = useState<HashItem[]>(initialHashes);
  const [message, setMessage] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [eta, setEta] = useState('00:00');
  const [averageSpeed, setAverageSpeed] = useState('0 hashes/min');

  const start = () => {
    const candidates =
      mode === 'wordlist'
        ? wordlist.split(/\r?\n/).filter(Boolean)
        : mode === 'incremental'
        ? generateIncremental(incLength)
        : [singleValue];

    setHashes(initialHashes.map((h) => ({ ...h })));
    setMessage(null);
    setRunning(true);
    setStartTime(Date.now());
    setEta('00:00');
    setAverageSpeed('0 hashes/min');

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
    {
      key: 'single',
      label: 'Single hash focus',
      description:
        'Point John at a known candidate to validate a password quickly.',
      example: 'john --format=raw-md5 --single sample.hash',
    },
    {
      key: 'incremental',
      label: 'Incremental brute-force',
      description:
        'Generate short keyspaces in memory for a classroom-safe brute-force.',
      example: 'john --incremental=Lower demo.hash',
    },
    {
      key: 'wordlist',
      label: 'Wordlist playback',
      description: 'Replay curated workshop lists to simulate fast cracks.',
      example: 'john --wordlist=training.txt --format=raw-md5 demo.hash',
    },
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
    weak: 'bg-rose-500/15 text-rose-100 ring-1 ring-inset ring-rose-500/50',
    medium: 'bg-amber-500/15 text-amber-100 ring-1 ring-inset ring-amber-500/40',
    strong: 'bg-emerald-500/20 text-emerald-100 ring-1 ring-inset ring-emerald-500/40',
  } as const;

  const statusBadgeClass = {
    pending: 'bg-slate-500/15 text-slate-100 ring-1 ring-inset ring-slate-400/40',
    failed: 'bg-rose-500/20 text-rose-100 ring-1 ring-inset ring-rose-500/50',
    cracked: 'bg-emerald-500/25 text-emerald-100 ring-1 ring-inset ring-emerald-500/50',
  } as const;

  const overallProgress =
    hashes.reduce((sum, h) => sum + h.progress, 0) / hashes.length;

  const crackedCount = hashes.filter((h) => h.status === 'cracked').length;
  const completedCount = hashes.filter((h) => h.status !== 'pending').length;
  const hintsUsed = Math.min(crackedCount, HINTS.length);
  const hintsRemaining = Math.max(HINTS.length - hintsUsed, 0);
  const nextHints = HINTS.slice(hintsUsed, hintsUsed + 2);

  const tagToneClass = {
    success: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
    info: 'border-sky-400/40 bg-sky-500/15 text-sky-100',
    warning: 'border-amber-400/50 bg-amber-500/15 text-amber-100',
  } as const;

  useEffect(() => {
    if (!startTime) {
      setAverageSpeed('0 hashes/min');
      return;
    }

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds > 0) {
      if (completedCount > 0) {
        const perMinute = completedCount / (elapsedSeconds / 60);
        const formatted = perMinute >= 10 ? perMinute.toFixed(0) : perMinute.toFixed(1);
        setAverageSpeed(`${formatted} hashes/min`);
      } else {
        setAverageSpeed('0 hashes/min');
      }
    }

    if (!running || overallProgress <= 0) {
      if (!running) {
        setEta('00:00');
      }
      return;
    }

    const totalTime = elapsedSeconds / (overallProgress / 100);
    const remaining = Math.max(totalTime - elapsedSeconds, 0);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    setEta(
      `${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`,
    );
  }, [completedCount, overallProgress, running, startTime]);

  return (
    <div className="h-full w-full overflow-auto bg-gray-900 text-white">
      <div className="mx-auto flex h-full w-full flex-col gap-6 p-4 lg:max-w-6xl lg:flex-row">
        <section className="flex-1 space-y-7">
          <p className="text-xs text-yellow-300">
            {johnPlaceholders.banners.page}
          </p>

          <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-7">
            <div className="space-y-3">
              <header className="flex items-end justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
                      Attack profiles
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                      Select how the simulator schedules candidates before launching a run.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      running
                        ? 'bg-sky-500/20 text-sky-100 ring-1 ring-inset ring-sky-400/50'
                        : 'bg-slate-500/20 text-slate-100 ring-1 ring-inset ring-slate-400/40'
                    }`}
                  >
                    {running ? 'Active run' : 'Idle'}
                  </span>
                </header>
                <div className="grid gap-4 md:grid-cols-2">
                  {modes.map((m) => (
                    <article
                      key={m.key}
                      className={`group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 shadow-inner backdrop-blur transition-colors duration-150 hover:border-sky-400/60 hover:bg-sky-500/10 ${
                        mode === m.key
                          ? 'border-sky-400/70 bg-sky-500/10 ring-1 ring-inset ring-sky-400/50'
                          : 'dark:bg-white/5'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setMode(m.key)}
                        aria-pressed={mode === m.key}
                        className="flex w-full flex-1 flex-col gap-3 rounded-t-2xl px-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white">{m.label}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                              mode === m.key
                                ? 'bg-sky-500/20 text-sky-100 ring-1 ring-inset ring-sky-400/50'
                                : 'bg-white/5 text-gray-200 ring-1 ring-inset ring-white/10'
                            }`}
                          >
                            Mode
                          </span>
                        </div>
                        <p className="text-xs text-gray-200">{m.description}</p>
                        <div className="space-y-1 text-xs">
                          <span className="text-[11px] uppercase tracking-wide text-gray-400">Example</span>
                          <code className="block rounded bg-black/40 px-3 py-2 text-[11px] text-green-200">
                            {m.example}
                          </code>
                        </div>
                      </button>
                    {mode === m.key && (
                      <div className="space-y-3 border-t border-white/10 px-4 py-4 text-xs text-gray-100">
                        {m.key === 'single' && (
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-gray-300">
                              Candidate value
                            </span>
                            <input
                              type="text"
                              value={singleValue}
                              onChange={(e) => setSingleValue(e.target.value)}
                              className="rounded border border-white/10 bg-gray-900 px-2 py-1 text-sm text-white"
                              aria-label="Single candidate"
                            />
                          </label>
                        )}
                        {m.key === 'wordlist' && (
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-gray-300">
                              Wordlist entries
                            </span>
                            <textarea
                              value={wordlist}
                              onChange={(e) => setWordlist(e.target.value)}
                              className="min-h-[120px] rounded border border-white/10 bg-gray-900 p-2 text-sm text-white"
                              aria-label="Wordlist"
                            />
                          </label>
                        )}
                        {m.key === 'incremental' && (
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-gray-300">
                              Length
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={incLength}
                              onChange={(e) =>
                                setIncLength(parseInt(e.target.value, 10) || 1)
                              }
                              className="w-24 rounded border border-white/10 bg-gray-900 px-2 py-1 text-sm text-white"
                              aria-label="Incremental length"
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={start}
                  disabled={running}
                  className="rounded bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Start
                </button>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <span>Mode:</span>
                  <span className="font-semibold text-white">
                    {modes.find((m) => m.key === mode)?.label}
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4 text-gray-200">
                <header className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                  <span>Cracking timeline</span>
                  <span>{running ? 'Live monitoring' : 'Awaiting start'}</span>
                </header>
                <div className="h-2 w-full rounded-full bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-sky-500 transition-[width]"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span>Overall progress</span>
                  <span>ETA: {eta}</span>
                </div>
              </div>

              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between px-1 text-[11px] uppercase tracking-wide text-gray-400">
                  <span>Recovered hash list</span>
                  <span>Status</span>
                </div>
                <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {hashes.map((h) => (
                    <li
                      key={h.hash}
                      className="grid gap-3 px-3 py-3 text-xs text-gray-100 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:items-center sm:text-sm"
                    >
                      <div className="space-y-2">
                        <span className="block truncate text-[13px] sm:text-sm">{h.hash}</span>
                        <div className="h-1.5 w-full rounded-full bg-gray-700">
                          <div
                            className="h-1.5 rounded-full bg-sky-500 transition-[width]"
                            style={{ width: `${h.progress}%` }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      {h.status === 'cracked' ? (
                        <div className="flex flex-col items-end gap-2 text-right">
                          <span className="truncate text-xs text-emerald-100 sm:text-sm">
                            {h.password}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] uppercase tracking-wide ${strengthClass[h.strength!]}`}
                          >
                            {h.strength}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${statusBadgeClass[h.status]}`}
                          >
                            {h.status === 'pending' ? 'In progress' : 'Failed'}
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {message && (
                <div
                  className={`rounded p-2 text-sm ${
                    message.type === 'success'
                      ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                      : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>

            <aside className="mt-6 space-y-4 rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-gray-200 lg:mt-0">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Run summary</h3>
                <span className="text-[11px] uppercase tracking-wide text-gray-400">Simulation</span>
              </header>
              <ul className="space-y-3">
                <li className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-100">Cracked hashes</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        tagToneClass[
                          crackedCount === hashes.length
                            ? 'success'
                            : crackedCount > 0
                            ? 'info'
                            : 'warning'
                        ]
                      }`}
                    >
                      {crackedCount} / {hashes.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Completed hashes update automatically as the demo runs.
                  </p>
                </li>
                <li className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-100">Average speed</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tagToneClass.info}`}
                    >
                      {averageSpeed}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Based on completed hashes divided by elapsed runtime.
                  </p>
                </li>
                <li className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-100">Hints remaining</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        tagToneClass[hintsRemaining > 0 ? 'warning' : 'success']
                      }`}
                    >
                      {hintsRemaining}
                    </span>
                  </div>
                  {hintsRemaining > 0 ? (
                    <ul className="space-y-1 text-[11px] text-gray-400">
                      {nextHints.map((hint) => (
                        <li key={hint} className="flex gap-2">
                          <span aria-hidden="true">•</span>
                          <span>{hint}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-gray-400">All workshop tips have been revealed.</p>
                  )}
                </li>
              </ul>
            </aside>
          </div>

          <AuditSimulator />
        </section>

        <div className="flex-1 rounded-lg border border-white/10 bg-black/40">
          <LabMode>
            <LabPanels fixtures={fixtures} />
          </LabMode>
        </div>
      </div>
    </div>
  );
};

export default JohnApp;
