'use client';

import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import RulesSandbox from './components/RulesSandbox';
import StatsChart from '../../components/StatsChart';
import { formatNumber } from '@/lib/intl';

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
  const ruleOptions = [
    ...Object.keys(defaultRuleSets),
    ...Object.keys(customRuleSets),
  ];
  const combinedRuleSets = { ...defaultRuleSets, ...customRuleSets };
  const rulePreview = (combinedRuleSets[ruleSet] || [])
    .slice(0, 10)
    .join('\n');

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

  return (
    <div className="min-h-screen space-y-4 bg-[var(--kali-panel)] p-4 text-[color:var(--kali-text)]">
      <h1 className="text-2xl font-semibold text-[color:var(--kali-text)]">Hashcat Simulator</h1>

      <div>
        <label className="block mb-1">Attack Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {attackModes.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setAttackMode(m.value)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                attackMode === m.value
                  ? 'border-kali-control bg-[color:color-mix(in_srgb,var(--kali-control)_18%,var(--kali-panel))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--kali-control)_35%,transparent)]'
                  : 'border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] hover:border-kali-control/70 hover:bg-[color:color-mix(in_srgb,var(--kali-panel-highlight)_85%,var(--kali-control)_15%)]'
              }`}
            >
              <span className="text-2xl">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showMask && (
      <div>
          <label className="mb-1 block" htmlFor="hashcat-mask-input">
            Mask
          </label>
          <input
            id="hashcat-mask-input"
            type="text"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
            className="mb-2 w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 font-mono text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/40"
            aria-label="Mask pattern"
          />
          <div className="space-x-2">
            {['?l', '?u', '?d', '?s', '?a'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => appendMask(t)}
                className="rounded bg-kali-control px-2 py-1 text-sm font-semibold text-[color:var(--color-dark)] transition-colors hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              >
                {t}
              </button>
            ))}
          </div>
          {mask && (
            <div className="mt-2">
              <p>Candidate space: {formatNumber(maskStats.count)}</p>
              <p className="text-sm">
                Estimated @1M/s: {formatTime(maskStats.time)}
              </p>
              <StatsChart count={maskStats.count} time={maskStats.time} />
            </div>
          )}
        </div>
      )}

      <div>
          <label className="block mb-1" htmlFor="hashcat-hash-input">
            Hash
          </label>
          <div className="flex space-x-2">
            <input
              id="hashcat-hash-input"
              type={showHash ? 'text' : 'password'}
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              className="w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 font-mono text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/40"
              placeholder="Paste hash here"
              aria-label="Hash value"
            />
            <button
              type="button"
              onClick={() => setShowHash((s) => !s)}
              className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 text-sm transition-colors hover:border-kali-control/70 hover:bg-[color:color-mix(in_srgb,var(--kali-panel-highlight)_85%,var(--kali-control)_15%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              {showHash ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="mt-1 text-sm">Detected: {hashType}</div>
        </div>

        <div>
          <label className="block mb-1" htmlFor="hashcat-dictionary-input">
            Dictionaries
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              id="hashcat-dictionary-input"
              type="text"
              value={dictInput}
              onChange={(e) => setDictInput(e.target.value)}
              className="flex-1 rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)] focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/40"
              placeholder="rockyou.txt"
              aria-label="Dictionary path"
            />
            <button
              type="button"
              onClick={addDictionary}
              className="rounded bg-kali-control px-2 py-1 text-sm font-semibold text-[color:var(--color-dark)] transition-colors hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {dictionaries.map((d) => (
              <span
                key={d}
                className="flex items-center rounded-full border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 text-sm"
              >
                {d}
                <button
                  type="button"
                  onClick={() => removeDictionary(d)}
                  className="ml-1 text-lg leading-none text-[color:var(--kali-text)] transition-colors hover:text-kali-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

      <div>
        <label className="mb-1 block">Rule Set</label>
        <select
          value={ruleSet}
          onChange={(e) => setRuleSet(e.target.value)}
          className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-1 text-[color:var(--kali-text)] focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/40"
        >
          {ruleOptions.map((r) => (
            <option key={r} value={r}>
              {r === 'none' ? 'None' : r}
            </option>
          ))}
        </select>
        <pre className="mt-2 h-32 overflow-auto rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--color-dark)] p-2 font-mono leading-[1.2] text-[color:var(--kali-terminal-green)] shadow-inner">
          {rulePreview || '(no rules)'}
        </pre>
      </div>

      <RulesSandbox
        savedSets={customRuleSets}
        onChange={setCustomRuleSets}
        setRuleSet={setRuleSet}
      />

      <div>
        <button
          type="button"
          onClick={running ? stop : start}
          className={`rounded px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
            running
              ? 'bg-kali-severity-critical hover:bg-kali-severity-critical/90'
              : 'bg-kali-severity-low hover:bg-kali-severity-low/90'
          }`}
        >
          {running ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-[color:var(--kali-text)] shadow-inner">
        <div className="h-2 w-full overflow-hidden rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_65%,transparent)]">
          <div
            className={`h-2 rounded ${running ? 'bg-kali-severity-medium' : 'bg-kali-severity-low'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-center mt-1">ETA: {eta}</div>
      </div>
      <div className="h-32 overflow-auto rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--color-dark)] p-2 font-mono text-xs text-[color:var(--kali-terminal-green)] shadow-inner">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <div className="text-sm">Recovered: {recovered}/{total}</div>
    </div>
  );
};

export default Hashcat;

