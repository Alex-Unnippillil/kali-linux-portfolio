'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const maskPresets = [
  {
    label: '4-digit PIN',
    mask: '?d?d?d?d',
    description: 'Numeric keypad brute-force covering 0000-9999.',
  },
  {
    label: 'Mixed 6',
    mask: '?l?l?l?d?d?d',
    description:
      'Lowercase letters followed by digits – useful for simple word+number combos.',
  },
  {
    label: 'Alphanumeric 8',
    mask: '?u?l?l?l?d?d?d?d',
    description:
      'Common corporate-style password with an uppercase letter and trailing digits.',
  },
];

const difficultyToneStyles = {
  easy: {
    container: 'border-green-500/60 bg-green-900/30',
    badge: 'border-green-400/70 bg-green-800/60 text-green-100',
  },
  moderate: {
    container: 'border-yellow-500/60 bg-yellow-900/30',
    badge: 'border-yellow-400/70 bg-yellow-800/60 text-yellow-100',
  },
  hard: {
    container: 'border-red-500/60 bg-red-900/30',
    badge: 'border-red-400/70 bg-red-800/60 text-red-100',
  },
  unknown: {
    container: 'border-gray-600 bg-gray-800/70',
    badge: 'border-gray-500 bg-gray-700/70 text-gray-100',
  },
};

type DifficultyTone = keyof typeof difficultyToneStyles;

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

  const activeMode = useMemo(
    () => attackModes.find((m) => m.value === attackMode),
    [attackMode],
  );

  const difficulty = useMemo(() => {
    if (showMask && maskStats.count > 0) {
      if (maskStats.count < 1_000_000) {
        return { tone: 'easy' as DifficultyTone, label: 'Estimated difficulty: Easy' };
      }
      if (maskStats.count < 1_000_000_000) {
        return {
          tone: 'moderate' as DifficultyTone,
          label: 'Estimated difficulty: Moderate',
        };
      }
      return { tone: 'hard' as DifficultyTone, label: 'Estimated difficulty: Hard' };
    }
    const fallback: Record<string, { tone: DifficultyTone; label: string }> = {
      '0': { tone: 'moderate', label: 'Estimated difficulty: Moderate' },
      '3': { tone: 'hard', label: 'Estimated difficulty: Hard' },
      '6': { tone: 'moderate', label: 'Estimated difficulty: Moderate' },
      '7': { tone: 'hard', label: 'Estimated difficulty: Hard' },
    };
    return fallback[attackMode] ?? {
      tone: 'unknown' as DifficultyTone,
      label: 'Estimated difficulty: Unknown',
    };
  }, [attackMode, maskStats.count, showMask]);

  const difficultyStyles = difficultyToneStyles[difficulty.tone];

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
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl">Hashcat Simulator</h1>

      <section
        aria-label="Hashcat cracking summary"
        className={`rounded-lg border p-4 shadow-inner transition-colors ${difficultyStyles.container}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Summary</h2>
          <span
            className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full border ${difficultyStyles.badge}`}
            data-testid="summary-difficulty"
          >
            {difficulty.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-200/80">
          Live status for the current cracking configuration.
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3" aria-live="polite">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-300/70">
              Attack Mode
            </dt>
            <dd
              className="text-base font-medium"
              data-testid="summary-attack-mode"
            >
              {activeMode?.label ?? 'Unknown'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-300/70">
              Detected Hash Type
            </dt>
            <dd className="text-base font-medium" data-testid="summary-hash-type">
              {hashType}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-300/70">ETA</dt>
            <dd className="text-base font-medium" data-testid="summary-eta">
              {eta}
            </dd>
          </div>
        </dl>
      </section>

      <div>
        <label className="block mb-1">Attack Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {attackModes.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setAttackMode(m.value)}
              className={`p-3 rounded-lg bg-gray-800 flex flex-col items-center gap-1 border ${
                attackMode === m.value ? 'border-green-500' : 'border-transparent'
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
          <label className="block mb-1" htmlFor="hashcat-mask-input">
            Mask
          </label>
          <input
            id="hashcat-mask-input"
            type="text"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
            className="text-black p-1 w-full font-mono mb-2"
            aria-label="Mask pattern"
          />
          <div className="space-x-2">
            {['?l', '?u', '?d', '?s', '?a'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => appendMask(t)}
                className="px-2 py-1 bg-blue-600 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-300">
            Special tokens: <code className="text-blue-200">?l</code> lowercase,{' '}
            <code className="text-blue-200">?u</code> uppercase,{' '}
            <code className="text-blue-200">?d</code> digits,{' '}
            <code className="text-blue-200">?s</code> symbols,{' '}
            <code className="text-blue-200">?a</code> printable ASCII.
          </p>
          <div className="mt-3 space-y-2" aria-label="Mask presets">
            {maskPresets.map((preset) => (
              <div key={preset.mask} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMask(preset.mask)}
                  className="px-3 py-1 bg-gray-800 rounded border border-gray-700 text-sm hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  <span className="font-semibold">{preset.label}</span>{' '}
                  <span className="font-mono text-xs text-gray-300">({preset.mask})</span>
                </button>
                <span
                  className="cursor-help text-sm text-gray-200"
                  role="img"
                  aria-label={`${preset.label} details`}
                  title={preset.description}
                >
                  ⓘ
                </span>
              </div>
            ))}
          </div>
          {mask && (
            <div className="mt-2">
              <p>Candidate space: {maskStats.count.toLocaleString()}</p>
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
              className="text-black p-1 w-full font-mono"
              placeholder="Paste hash here"
              aria-label="Hash value"
            />
          <button
            type="button"
            onClick={() => setShowHash((s) => !s)}
            className="px-2 py-1 bg-gray-700 rounded"
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
              className="text-black p-1 flex-1"
              placeholder="rockyou.txt"
              aria-label="Dictionary path"
            />
          <button
            type="button"
            onClick={addDictionary}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {dictionaries.map((d) => (
            <span
              key={d}
              className="bg-gray-700 px-2 py-1 rounded-full text-sm flex items-center"
            >
              {d}
              <button
                type="button"
                onClick={() => removeDictionary(d)}
                className="ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block mb-1">Rule Set</label>
        <select
          value={ruleSet}
          onChange={(e) => setRuleSet(e.target.value)}
          className="text-black p-1 rounded"
        >
          {ruleOptions.map((r) => (
            <option key={r} value={r}>
              {r === 'none' ? 'None' : r}
            </option>
          ))}
        </select>
        <pre className="bg-black text-green-400 p-2 mt-2 rounded overflow-auto h-32 font-mono leading-[1.2]">
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
          className="px-4 py-2 bg-green-600 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
        >
          {running ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded">
        <div className="w-full bg-gray-400 dark:bg-gray-600 rounded h-2">
          <div
            className="h-2 bg-green-500 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-center mt-1">ETA: {eta}</div>
      </div>
      <div className="bg-black text-green-400 p-2 h-32 overflow-auto font-mono text-xs">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <div className="text-sm">Recovered: {recovered}/{total}</div>
    </div>
  );
};

export default Hashcat;

