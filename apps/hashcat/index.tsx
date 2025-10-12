'use client';

import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import RulesSandbox from './components/RulesSandbox';
import StatsChart from '../../components/StatsChart';

interface Preset {
  value: string;
  label: string;
  icon: string;
}

interface RuleSets {
  [key: string]: string[];
}

const attackModes: Preset[] = [
  { value: '0', label: 'Straight', icon: '📄' },
  { value: '3', label: 'Brute-force', icon: '💣' },
  { value: '6', label: 'Wordlist + Mask', icon: '🧩' },
  { value: '7', label: 'Mask + Wordlist', icon: '🔀' },
];

const defaultRuleSets: RuleSets = {
  none: [],
  best64: ['c', 'u', 'l', 'r', 'd', 'p', 't', 's'],
  quick: ['l', 'u', 'c', 'd'],
};

const Hashcat: React.FC = () => {
  const [attackMode, setAttackMode] = useState('0');
  const [mask, setMask] = useState('');
  const appendMask = (token: string) => setMask((m) => m + token);
  const [maskStats, setMaskStats] = useState({ count: 0, time: 0 });

  const [hashInput, setHashInput] = useState('');
  const [showHash, setShowHash] = useState(false);
  const [hashType, setHashType] = useState('Unknown');
  const [dictInput, setDictInput] = useState('');
  const [dictionaries, setDictionaries] = useState<string[]>([]);
  const addDictionary = () => {
    if (dictInput && !dictionaries.includes(dictInput)) {
      setDictionaries((d) => [...d, dictInput]);
    }
    setDictInput('');
  };
  const removeDictionary = (name: string) =>
    setDictionaries((d) => d.filter((n) => n !== name));

  useEffect(() => {
    const hex = /^[a-f0-9]+$/i;
    if (hex.test(hashInput)) {
      if (hashInput.length === 32) setHashType('MD5');
      else if (hashInput.length === 40) setHashType('SHA1');
      else if (hashInput.length === 64) setHashType('SHA256');
      else setHashType('Unknown');
    } else {
      setHashType('Unknown');
    }
  }, [hashInput]);

  const [customRuleSets, setCustomRuleSets] = usePersistentState<RuleSets>(
    'hashcatRuleSets',
    {},
  );
  const [ruleSet, setRuleSet] = useState('none');
  const defaultRuleKeys = Object.keys(defaultRuleSets);
  const customRuleKeys = Object.keys(customRuleSets);
  const combinedRuleSets = { ...defaultRuleSets, ...customRuleSets };
  const rulePreview = (combinedRuleSets[ruleSet] || [])
    .slice(0, 10)
    .join('\n');
  const [rulePanel, setRulePanel] = useState<'defaults' | 'custom'>(
    customRuleKeys.includes(ruleSet) ? 'custom' : 'defaults',
  );

  useEffect(() => {
    if (customRuleKeys.includes(ruleSet)) {
      setRulePanel('custom');
    } else {
      setRulePanel('defaults');
    }
  }, [ruleSet, customRuleKeys]);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState('00:00');
  const [recovered, setRecovered] = useState(0);
  const total = 1;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    setRunning(true);
    setProgress(0);
    setRecovered(0);
    setEta('00:00');
    setLogs([]);
    stopInterval();
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.random() * 5, 100);
        const remaining = (100 - next) * 0.6; // total ~60s
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        setEta(`${mins.toString().padStart(2, '0')}:${secs
          .toString()
          .padStart(2, '0')}`);
        const currentSpeed = 1000 + Math.random() * 500;
        setLogs((l) =>
          [...l.slice(-19), `Progress ${next.toFixed(1)}% @ ${currentSpeed.toFixed(0)} H/s`]
        );
        if (next >= 100) {
          setRecovered(total);
          setRunning(false);
          stopInterval();
          setLogs((l) => [...l, 'Cracking complete']);
        }
        return next;
      });
    }, 500);
  };

  const stop = () => {
    setRunning(false);
    stopInterval();
  };

  useEffect(() => () => stopInterval(), []);

  const showMask = attackMode === '3' || attackMode === '6' || attackMode === '7';

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(2)}m`;
    const hours = minutes / 60;
    if (hours < 24) return `${hours.toFixed(2)}h`;
    const days = hours / 24;
    return `${days.toFixed(2)}d`;
  };

  useEffect(() => {
    if (!mask) {
      setMaskStats({ count: 0, time: 0 });
      return;
    }
    const sets: Record<string, number> = {
      '?l': 26,
      '?u': 26,
      '?d': 10,
      '?s': 33,
      '?a': 95,
    };
    let total = 1;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === '?' && i < mask.length - 1) {
        const token = mask.slice(i, i + 2);
        if (sets[token]) {
          total *= sets[token];
          i++;
          continue;
        }
      }
      total *= 1;
    }
    setMaskStats({ count: total, time: total / 1_000_000 });
  }, [mask]);

  // progress and eta are displayed in a neutral banner

  const statusLabel = running
    ? 'Running'
    : progress >= 100
    ? 'Complete'
    : progress > 0
    ? 'Paused'
    : 'Idle';
  const progressColor = running
    ? 'bg-emerald-500'
    : progress >= 100
    ? 'bg-sky-500'
    : 'bg-amber-500';

  return (
    <div className="p-6 bg-gray-950 text-slate-100 min-h-screen space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Hashcat Simulator</h1>
        <p className="text-sm text-slate-400">
          Configure attack strategies, stage wordlists, and preview rule effects before running the simulated crack.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner">
          <header className="flex items-center justify-between gap-2">
            <span className="text-sm uppercase tracking-wider text-slate-400">
              Attack Mode Presets
            </span>
            <span className="text-xs text-slate-500">Select the baseline workflow</span>
          </header>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {attackModes.map((m) => {
              const active = attackMode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setAttackMode(m.value)}
                  className={`group flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    active
                      ? 'border-emerald-400/80 bg-emerald-500/10 shadow-lg shadow-emerald-500/30'
                      : 'border-slate-700/80 bg-slate-800/60 hover:border-slate-500'
                  }`}
                >
                  <span className="text-2xl" aria-hidden>{m.icon}</span>
                  <span className="text-sm font-medium text-slate-100 group-hover:text-white">
                    {m.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {active ? 'Active preset' : 'Tap to activate'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="hashcat-hash-input">
              Hash Sample
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="hashcat-hash-input"
                type={showHash ? 'text' : 'password'}
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 p-2 font-mono text-sm text-emerald-300 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="Paste hash here"
                aria-label="Hash value"
              />
              <button
                type="button"
                onClick={() => setShowHash((s) => !s)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-200 transition hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {showHash ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-400">Detected: {hashType}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="hashcat-dictionary-input">
              Dictionaries
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="hashcat-dictionary-input"
                type="text"
                value={dictInput}
                onChange={(e) => setDictInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="rockyou.txt"
                aria-label="Dictionary path"
              />
              <button
                type="button"
                onClick={addDictionary}
                className="rounded-lg border border-emerald-500/60 bg-emerald-500/20 px-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {dictionaries.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeDictionary(d)}
                    className="rounded-full bg-slate-900/80 px-2 text-slate-400 transition hover:text-emerald-300"
                  >
                    ×
                  </button>
                </span>
              ))}
              {dictionaries.length === 0 && (
                <span className="text-xs text-slate-500">No dictionaries staged</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {showMask && (
        <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-inner">
            <header className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">Mask Builder</span>
              <span className="text-xs text-slate-500">Click tokens to append</span>
            </header>
            <input
              id="hashcat-mask-input"
              type="text"
              value={mask}
              onChange={(e) => setMask(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-100/90 p-2 font-mono text-sm text-slate-900 shadow focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              aria-label="Mask pattern"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {['?l', '?u', '?d', '?s', '?a'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => appendMask(t)}
                  className="rounded-full border border-slate-400/60 bg-white/80 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {mask && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Candidate space: <span className="font-mono text-emerald-300">{maskStats.count.toLocaleString()}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Estimated @1M/s: {formatTime(maskStats.time)}
                </p>
              </div>
              <StatsChart count={maskStats.count} time={maskStats.time} />
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-100">Rule Sets</h2>
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-800/80 p-1 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setRulePanel('defaults')}
                className={`rounded-full px-3 py-1 transition ${
                  rulePanel === 'defaults'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'hover:text-slate-200'
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => setRulePanel('custom')}
                className={`rounded-full px-3 py-1 transition ${
                  rulePanel === 'custom'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'hover:text-slate-200'
                }`}
              >
                Custom ({customRuleKeys.length})
              </button>
            </div>
          </div>
          <span className="text-xs text-slate-500">Tap a tab to switch libraries</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(rulePanel === 'defaults' ? defaultRuleKeys : customRuleKeys).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRuleSet(r)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                ruleSet === r
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                  : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500'
              }`}
            >
              {r === 'none' ? 'None' : r}
            </button>
          ))}
          {(rulePanel === 'custom' && customRuleKeys.length === 0) && (
            <span className="text-xs text-slate-500">Saved rule sets appear here.</span>
          )}
        </div>

        <pre className="bg-slate-950 text-emerald-200/90 p-3 rounded-xl overflow-auto h-36 font-mono text-xs leading-[1.35] border border-slate-800">
          {rulePreview || '(no rules)'}
        </pre>

        <RulesSandbox
          savedSets={customRuleSets}
          onChange={setCustomRuleSets}
          setRuleSet={setRuleSet}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-inner space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Simulation Control</p>
              <h3 className="text-lg font-semibold text-slate-100">Status: {statusLabel}</h3>
            </div>
            <button
              type="button"
              onClick={running ? stop : start}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                running
                  ? 'border border-rose-500/70 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                  : 'border border-emerald-500/70 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
              }`}
            >
              {running ? 'Pause simulation' : progress > 0 && progress < 100 ? 'Resume simulation' : 'Start simulation'}
            </button>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-slate-800">
              <div
                className={`h-3 rounded-full transition-all duration-300 ease-out ${progressColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ETA: {eta}</span>
              <span>Recovered: {recovered}/{total}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner">
          <h3 className="text-sm font-semibold text-slate-200">Engine Log</h3>
          <div className="mt-2 h-40 overflow-auto rounded-xl border border-slate-800 bg-black/80 p-3 font-mono text-[11px] text-emerald-200">
            {logs.map((l, i) => (
              <div key={i} className="whitespace-pre">{l}</div>
            ))}
            {logs.length === 0 && (
              <div className="text-slate-500">Simulation idle…</div>
            )}
          </div>
        </div>
      </section>
    
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
        <p>
          Timers continue to advance while the simulation is running. Pausing preserves progress for inspection before resuming.
        </p>
      </div>
    </div>
  );
};

export default Hashcat;

