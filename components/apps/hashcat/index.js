import React, { useState, useEffect, useRef } from 'react';
import progressInfo from './progress.json';
import StatsChart from '../../StatsChart';

export const hashTypes = [
  {
    id: '0',
    name: 'MD5',
    summary: 'Raw MD5',
    regex: /^[a-f0-9]{32}$/i,
    example: '5f4dcc3b5aa765d61d8327deb882cf99',
    output: 'password',
    description: 'Fast, legacy 32-character hash',
  },
  {
    id: '100',
    name: 'SHA1',
    summary: 'SHA-1',
    regex: /^[a-f0-9]{40}$/i,
    example: '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8',
    output: 'password',
    description: '160-bit secure hash algorithm',
  },
  {
    id: '1400',
    name: 'SHA256',
    summary: 'SHA-256',
    regex: /^[a-f0-9]{64}$/i,
    example:
      '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    output: 'password',
    description: '256-bit SHA2 hash',
  },
  {
    id: '3200',
    name: 'bcrypt',
    summary: 'bcrypt $2*$',
    regex: /^\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}$/,
    example:
      '$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    output: 'password',
    description: 'Adaptive hash with salt and cost factor',
  },
];

const attackModes = [
  { value: '0', label: 'Straight' },
  { value: '3', label: 'Brute-force' },
  { value: '6', label: 'Hybrid Wordlist + Mask' },
  { value: '7', label: 'Hybrid Mask + Wordlist' },
];

const attackModeDetails = [
  {
    value: '0',
    title: 'Straight',
    icon: '📄',
    diagram: ['📁 Wordlist', '⚙️ Rules (optional)', '🎯 Hash'],
    bullets: [
      'Iterates the chosen wordlist as-is.',
      'Ideal for curated dictionaries.',
      'Rule engine tweaks words on the fly.',
    ],
  },
  {
    value: '3',
    title: 'Brute-force',
    icon: '💣',
    diagram: ['🎲 Charset', '🔁 Mask', '🎯 Hash'],
    bullets: [
      'Searches every candidate defined by the mask.',
      'Great for short or structured passwords.',
      'GPU intensive — monitor keyspace growth.',
    ],
  },
  {
    value: '6',
    title: 'Wordlist + Mask',
    icon: '🧩',
    diagram: ['📁 Wordlist', '➕ Mask', '🎯 Hash'],
    bullets: [
      'Appends mask tokens to each dictionary entry.',
      'Useful for suffix patterns like years or digits.',
      'Combine with rules for layered mutations.',
    ],
  },
  {
    value: '7',
    title: 'Mask + Wordlist',
    icon: '🔀',
    diagram: ['🔁 Mask', '➕ Wordlist', '🎯 Hash'],
    bullets: [
      'Prefixes dictionary words with mask content.',
      'Pairs well with username-based guesses.',
      'Keeps hybrid attacks flexible.',
    ],
  },
];

const defaultWordlists = [
  {
    id: 'rockyou',
    name: 'rockyou.txt',
    entries: 14344392,
    size: 139_921_497,
  },
  {
    id: 'top100',
    name: 'top-100.txt',
    entries: 100,
    size: 900,
  },
];

const WORDLIST_STORAGE_KEY = 'hashcatWordlists';

const loadStoredWordlists = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(WORDLIST_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => ({
        id: item.id,
        name: item.name || 'custom.txt',
        entries: Number(item.entries) || 0,
        size: Number(item.size) || 0,
      }));
  } catch (error) {
    return [];
  }
};

const formatBytes = (value) => {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024))
  );
  const size = value / 1024 ** index;
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const ruleSets = {
  none: [],
  best64: ['c', 'u', 'l', 'r', 'd', 'p', 't', 's'],
  quick: ['l', 'u', 'c', 'd'],
};

const sampleOutput = `hashcat (v6.2.6) starting in benchmark mode...
OpenCL API (OpenCL 3.0) - Platform #1 [MockGPU]
* Device #1: Mock GPU

Benchmark relevant options:
===========================
* --hash-type: 0 (MD5)
* --wordlist: rockyou.txt

Speed.#1.........: 100.0 H/s (100.00%)
`;

export const detectHashType = (hash) => {
  const type = hashTypes.find((t) => t.regex.test(hash));
  return type ? type.id : hashTypes[0].id;
};

const digitChars = '0123456789'.split('');
const lowerChars = 'abcdefghijklmnopqrstuvwxyz'.split('');
const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const specialChars = [
  ' ',
  '!',
  '"',
  '#',
  '$',
  '%',
  '&',
  "'",
  '(',
  ')',
  '*',
  '+',
  ',',
  '-',
  '.',
  '/',
  ':',
  ';',
  '<',
  '=',
  '>',
  '?',
  '@',
  '[',
  '\\',
  ']',
  '^',
  '_',
  '`',
  '{',
  '|',
  '}',
  '~',
];

const maskTokenSets = {
  '?d': digitChars,
  '?l': lowerChars,
  '?u': upperChars,
  '?s': specialChars,
};

maskTokenSets['?a'] = [
  ...maskTokenSets['?l'],
  ...maskTokenSets['?u'],
  ...maskTokenSets['?d'],
  ...maskTokenSets['?s'],
];

export const generateWordlist = (pattern) => {
  const mask = pattern || '';
  if (!mask.length) {
    return [''];
  }

  const tokens = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === '?' && i < mask.length - 1) {
      const token = `?${mask[i + 1]}`;
      const charset = maskTokenSets[token];
      if (charset) {
        tokens.push(charset);
        i += 1;
        continue;
      }
    }
    tokens.push([mask[i]]);
  }

  const results = [];
  const max = 1000;

  const helper = (index, prefix) => {
    if (results.length >= max) {
      return;
    }
    if (index === tokens.length) {
      results.push(prefix);
      return;
    }
    const choices = tokens[index];
    for (let j = 0; j < choices.length && results.length < max; j++) {
      helper(index + 1, prefix + choices[j]);
    }
  };

  helper(0, '');
  return results;
};

const Gauge = ({ value }) => (
  <div className="w-48">
    <div className="text-sm mb-1">GPU Usage: {value}%</div>
    <div className="w-full h-4 bg-gray-700 rounded">
      <div
        className="h-4 bg-green-500 rounded"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const ProgressGauge = ({ progress, info, reduceMotion }) => {
  const hashRates = Array.isArray(info.hashRate)
    ? info.hashRate
    : [info.hashRate];
  const etas = Array.isArray(info.eta) ? info.eta : [info.eta];
  const recovered = Array.isArray(info.recovered)
    ? info.recovered
    : [info.recovered];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion || hashRates.length === 1) {
      setIndex(hashRates.length - 1);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % hashRates.length;
      setIndex(i);
    }, 1000);
    return () => clearInterval(interval);
  }, [reduceMotion, hashRates.length]);

  return (
    <div
      className="w-48"
      role="progressbar"
      aria-label="Hash cracking progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-valuetext={`${progress}%`}
    >
      <div className="text-sm mb-1">Progress: {progress}%</div>
      <div className="w-full h-4 bg-gray-700 rounded">
        <div
          className="h-4 bg-blue-600 rounded"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div role="status" aria-live="polite" className="text-sm mt-2">
        <div>Attempts/sec: {hashRates[index]}</div>
        <div>ETA: {etas[index]}</div>
        <div>Recovered: {recovered[index]}</div>
        <div>Mode: {info.mode}</div>
      </div>
    </div>
  );
};

function HashcatApp() {
  const [hashType, setHashType] = useState(hashTypes[0].id);
  const [hashInput, setHashInput] = useState('');
  const [hashFilter, setHashFilter] = useState('');
  const [gpuUsage, setGpuUsage] = useState(0);
  const [benchmark, setBenchmark] = useState('');
  const [pattern, setPattern] = useState('');
  const [wordlistUrl, setWordlistUrl] = useState('');
  const [wordlist, setWordlist] = useState('');
  const [customWordlists, setCustomWordlists] = useState(() =>
    loadStoredWordlists()
  );
  const [newWordlistName, setNewWordlistName] = useState('');
  const [newWordlistEntries, setNewWordlistEntries] = useState('');
  const [wordlistStatus, setWordlistStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [isCracking, setIsCracking] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [attackMode, setAttackMode] = useState('0');
  const [mask, setMask] = useState('');
  const appendMask = (token) => setMask((m) => m + token);
  const [maskStats, setMaskStats] = useState({ count: 0, time: 0 });
  const showMask = ['3', '6', '7'].includes(attackMode);
  const [ruleSet, setRuleSet] = useState('none');
  const rulePreview = (ruleSets[ruleSet] || []).slice(0, 10).join('\n');
  const workerRef = useRef(null);
  const frameRef = useRef(null);

  const formatTime = (seconds) => {
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
    const sets = { '?l': 26, '?u': 26, '?d': 10, '?s': 33, '?a': 95 };
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

  useEffect(() => {
    const interval = setInterval(() => {
      setGpuUsage(Math.floor(Math.random() * 100));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      WORDLIST_STORAGE_KEY,
      JSON.stringify(customWordlists)
    );
  }, [customWordlists]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const startCracking = () => {
    if (isCracking) return;
    const expected = selected.output;
    setIsCracking(true);
    setProgress(0);
    setResult('');
    if (typeof window === 'undefined') return;
    if (typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./progress.worker.js', import.meta.url)
      );
      workerRef.current.postMessage({ target: progressInfo.progress });
      workerRef.current.onmessage = ({ data }) => {
        const update = () => {
          setProgress(data);
          if (data >= progressInfo.progress) {
            setResult(expected);
            cancelCracking(false);
          }
        };
        if (prefersReducedMotion) {
          update();
        } else {
          frameRef.current = requestAnimationFrame(update);
        }
      };
    } else {
      const target = progressInfo.progress;
      const animate = () => {
        setProgress((p) => {
          if (p >= target) {
            setResult(expected);
            cancelCracking(false);
            return p;
          }
          frameRef.current = requestAnimationFrame(animate);
          return p + 1;
        });
      };
      frameRef.current = requestAnimationFrame(animate);
    }
  };

  const cancelCracking = (reset = true) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ cancel: true });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setIsCracking(false);
    if (reset) {
      setProgress(0);
      setResult('');
    }
  };

  useEffect(() => {
    return () => cancelCracking();
  }, []);

  const selected = hashTypes.find((h) => h.id === hashType) || hashTypes[0];
  const filteredHashTypes = hashTypes.filter(
    (h) =>
      h.id.includes(hashFilter) ||
      h.name.toLowerCase().includes(hashFilter.toLowerCase())
  );
  const selectedHash = selected.name;
  const selectedMode =
    attackModes.find((m) => m.value === attackMode)?.label ||
    attackModes[0].label;
  const info = { ...progressInfo, mode: selectedMode };

  const handleHashChange = (e) => {
    const value = e.target.value.trim();
    setHashInput(value);
    setHashType(detectHashType(value));
  };

  const runBenchmark = () => {
    setBenchmark('Running benchmark...');
    setTimeout(() => {
      const speed = (4000 + Math.random() * 1000).toFixed(0);
      setBenchmark(`GPU0: ${speed} MH/s`);
    }, 500);
  };

  const createWordlist = () => {
    const list = generateWordlist(pattern);
    const blob = new Blob([list.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    setWordlistUrl(url);
  };

  const combinedWordlists = [...defaultWordlists, ...customWordlists];
  const selectedWordlist =
    combinedWordlists.find((item) => item.id === wordlist) || null;

  const handleAddWordlist = () => {
    setWordlistStatus(null);
    const entries = newWordlistEntries
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!entries.length) {
      setWordlistStatus({ type: 'error', text: 'Add at least one entry.' });
      return;
    }
    const name = (newWordlistName || '').trim() ||
      `custom-${customWordlists.length + 1}.txt`;
    const payload = entries.join('\n');
    const size = new TextEncoder().encode(payload).length;
    const newList = {
      id: `custom-${Date.now()}`,
      name,
      entries: entries.length,
      size,
    };
    setCustomWordlists((prev) => [...prev, newList]);
    setNewWordlistEntries('');
    setNewWordlistName('');
    setWordlistStatus({
      type: 'success',
      text: `${name} saved (${entries.length.toLocaleString()} entries).`,
    });
  };

  const handleRemoveWordlist = (id) => {
    const removed = customWordlists.find((item) => item.id === id);
    setCustomWordlists((prev) => prev.filter((item) => item.id !== id));
    if (wordlist === id) {
      setWordlist('');
    }
    if (removed) {
      setWordlistStatus({
        type: 'info',
        text: `${removed.name} removed.`,
      });
    }
  };

  useEffect(() => {
    if (!wordlistStatus) return undefined;
    const timeout = setTimeout(() => setWordlistStatus(null), 5000);
    return () => clearTimeout(timeout);
  }, [wordlistStatus]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-4 bg-ub-cool-grey text-white p-4 overflow-y-auto">
      <main className="flex-1 flex flex-col items-center gap-4">
        <div className="w-full max-w-3xl flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm" htmlFor="hash-input">
                Hash:
              </label>
              <input
                id="hash-input"
                type="text"
                aria-label="Hash value"
                className="mt-1 w-full text-black px-2 py-1"
                value={hashInput}
                onChange={handleHashChange}
              />
            </div>
            <div>
              <label className="block text-sm" htmlFor="hash-filter">
                Filter Modes:
              </label>
              <input
                id="hash-filter"
                type="text"
                aria-label="Filter hash modes"
                className="mt-1 w-full text-black px-2 py-1"
                value={hashFilter}
                onChange={(e) => setHashFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm" htmlFor="hash-type">
                Hash Type:
              </label>
              <select
                id="hash-type"
                className="mt-1 w-full text-black px-2 py-1"
                value={hashType}
                onChange={(e) => setHashType(e.target.value)}
              >
                {filteredHashTypes.length ? (
                  filteredHashTypes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.id} - {h.name} ({h.summary})
                    </option>
                  ))
                ) : (
                  <option disabled>No modes</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm" htmlFor="attack-mode">
                Attack Mode:
              </label>
              <select
                id="attack-mode"
                className="mt-1 w-full text-black px-2 py-1"
                value={attackMode}
                onChange={(e) => setAttackMode(e.target.value)}
              >
                {attackModes.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.value} - {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {showMask && (
            <div>
              <label className="block" htmlFor="mask-input">
                Mask
              </label>
              <input
                id="mask-input"
                type="text"
                aria-label="Mask pattern"
                className="text-black px-2 py-1 w-full mt-1"
                value={mask}
                onChange={(e) => setMask(e.target.value)}
              />
              <div className="space-x-2 mt-1">
                {['?l', '?u', '?d', '?s', '?a'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => appendMask(t)}
                    aria-label={`Add ${t} to mask`}
                    className="px-2 py-1 bg-black/40 border border-white/10 rounded"
                  >
                    {t}
                  </button>
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
            <label className="mr-2" htmlFor="rule-set">
              Rule Set:
            </label>
            <select
              id="rule-set"
              className="text-black px-2 py-1"
              value={ruleSet}
              onChange={(e) => setRuleSet(e.target.value)}
            >
              <option value="none">None</option>
              <option value="best64">best64</option>
              <option value="quick">quick</option>
            </select>
            <pre className="bg-black p-2 text-xs mt-2 overflow-auto h-24">
              {rulePreview || '(no rules)'}
            </pre>
          </div>
          <div className="grid gap-1 text-sm md:grid-cols-2">
            <div>Detected: {selectedHash}</div>
            <div>Summary: {selected.summary}</div>
            <div>Example hash: {selected.example}</div>
            <div>Expected output: {selected.output}</div>
            <div className="md:col-span-2">Description: {selected.description}</div>
          </div>
          <div>
            <button
              type="button"
              onClick={runBenchmark}
              className="px-3 py-1 bg-black/40 border border-white/10 rounded"
            >
              Run Benchmark
            </button>
            {benchmark && (
              <div data-testid="benchmark-output" className="mt-2">
                {benchmark}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm" htmlFor="wordlist-select">
              Wordlist:
            </label>
            <select
              id="wordlist-select"
              className="mt-1 text-black px-2 py-1 w-full"
              value={wordlist}
              onChange={(e) => setWordlist(e.target.value)}
            >
              <option value="">Select wordlist (demo)</option>
              {combinedWordlists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.entries.toLocaleString()} entries)
                </option>
              ))}
            </select>
            {selectedWordlist && (
              <div
                className="text-xs mt-1"
                data-testid="wordlist-meta"
              >
                {selectedWordlist.name} •{' '}
                {selectedWordlist.entries.toLocaleString()} entries •{' '}
                {formatBytes(selectedWordlist.size)}
              </div>
            )}
            <div className="text-xs mt-1">
              Wordlist selection is simulated. Common files live under{' '}
              <code>/usr/share/wordlists/</code> e.g.{' '}
              <code>/usr/share/wordlists/rockyou.txt</code>. Learn more at{' '}
              <a
                className="underline"
                href="https://hashcat.net/wiki/doku.php?id=wordlists"
                target="_blank"
                rel="noreferrer"
              >
                hashcat.net
              </a>
              .
            </div>
            <div className="text-xs mt-1">
              Sample entries: <code>password123</code>, <code>qwerty</code>,{' '}
              <code>letmein</code>
            </div>
          </div>
          <div className="bg-black/40 border border-white/10 rounded p-3">
            <h3 className="text-sm font-semibold">Custom wordlists</h3>
            <p className="text-xs text-gray-300">
              Persisted locally with <code>localStorage</code>; no uploads leave
              your browser.
            </p>
            <div className="mt-2">
              <label
                className="block text-xs uppercase tracking-wide"
                htmlFor="custom-wordlist-name"
              >
                Wordlist Name
              </label>
              <input
                id="custom-wordlist-name"
                type="text"
                className="mt-1 w-full text-black px-2 py-1"
                aria-label="Wordlist Name"
                value={newWordlistName}
                onChange={(e) => setNewWordlistName(e.target.value)}
              />
            </div>
            <div className="mt-2">
              <label
                className="block text-xs uppercase tracking-wide"
                htmlFor="custom-wordlist-entries"
              >
                Wordlist Entries (one per line)
              </label>
              <textarea
                id="custom-wordlist-entries"
                className="mt-1 w-full h-24 text-black px-2 py-1"
                aria-label="Wordlist Entries (one per line)"
                value={newWordlistEntries}
                onChange={(e) => setNewWordlistEntries(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="mt-3 px-3 py-1 bg-kali-blue text-black rounded"
              onClick={handleAddWordlist}
            >
              Add Wordlist
            </button>
            {wordlistStatus && (
              <div
                className={`mt-2 text-xs ${
                  wordlistStatus.type === 'error'
                    ? 'text-red-300'
                    : wordlistStatus.type === 'success'
                    ? 'text-green-300'
                    : 'text-blue-300'
                }`}
                role="status"
                aria-live="polite"
              >
                {wordlistStatus.text}
              </div>
            )}
            {customWordlists.length > 0 && (
              <ul
                className="mt-3 space-y-2 text-xs"
                aria-label="Custom wordlists"
              >
                {customWordlists.map((list) => (
                  <li
                    key={list.id}
                    className="flex items-center justify-between gap-2 bg-black/30 border border-white/5 rounded px-2 py-2"
                  >
                    <span>
                      {list.name} • {list.entries.toLocaleString()} entries •{' '}
                      {formatBytes(list.size)}
                    </span>
                    <button
                      type="button"
                      className="text-red-300 hover:text-red-200"
                      onClick={() => handleRemoveWordlist(list.id)}
                      aria-label={`Remove ${list.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="mr-2" htmlFor="word-pattern">
              Wordlist Pattern:
            </label>
            <input
              id="word-pattern"
              type="text"
              aria-label="Wordlist pattern"
              className="text-black px-2 py-1"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <button className="ml-2" type="button" onClick={createWordlist}>
              Generate
            </button>
            {wordlistUrl && (
              <a
                className="ml-2 underline"
                href={wordlistUrl}
                download="wordlist.txt"
              >
                Download
              </a>
            )}
            <div className="text-xs mt-1">Uploading wordlists is disabled.</div>
          </div>
          <div className="mt-2">
            <div className="text-sm">Demo Command:</div>
            <div className="flex items-center flex-wrap gap-2">
              <code
                className="bg-black px-2 py-1 text-xs"
                data-testid="demo-command"
              >
                {`hashcat -m ${hashType} -a ${attackMode} ${
                  hashInput || 'hash.txt'
                } ${selectedWordlist ? selectedWordlist.name : 'wordlist.txt'}${
                  showMask && mask ? ` ${mask}` : ''
                }${ruleSet !== 'none' ? ` -r ${ruleSet}.rule` : ''}`}
              </code>
              <button
                className="px-2 py-1 bg-black/40 border border-white/10 rounded"
                type="button"
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(
                      `hashcat -m ${hashType} -a ${attackMode} ${
                        hashInput || 'hash.txt'
                      } ${
                        selectedWordlist ? selectedWordlist.name : 'wordlist.txt'
                      }${showMask && mask ? ` ${mask}` : ''}${
                        ruleSet !== 'none' ? ` -r ${ruleSet}.rule` : ''
                      }`
                    );
                  }
                }}
              >
                Copy
              </button>
            </div>
          </div>
          <div className="mt-4 w-full max-w-md">
            <div className="text-sm">Sample Output:</div>
            <pre className="bg-black p-2 text-xs overflow-auto">
              hashcat (demo) starting

              5f4dcc3b5aa765d61d8327deb882cf99:password

              Session completed.
            </pre>
          </div>
          <Gauge value={gpuUsage} />
          <div className="text-xs">
            Note: real hashcat requires a compatible GPU.
          </div>
          {!isCracking ? (
            <button
              type="button"
              onClick={startCracking}
              className="px-3 py-1 bg-kali-blue text-black rounded"
            >
              Start Cracking
            </button>
          ) : (
            <button
              type="button"
              onClick={() => cancelCracking()}
              className="px-3 py-1 bg-black/40 border border-white/10 rounded"
            >
              Cancel
            </button>
          )}
          <ProgressGauge
            progress={progress}
            info={info}
            reduceMotion={prefersReducedMotion}
          />
          {result && <div>Result: {result}</div>}
          <pre className="bg-black text-green-400 p-2 rounded text-xs w-full max-w-md overflow-x-auto mt-4">
            {sampleOutput}
          </pre>
          <div className="text-xs mt-4">
            This tool simulates hash cracking for educational purposes only.
          </div>
        </div>
      </main>
      <aside className="lg:w-72 flex-shrink-0 bg-black/40 border border-white/10 rounded-lg p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Attack mode primer</h2>
          <p className="text-xs text-gray-300 mt-1">
            Each mode balances speed and coverage differently. Compare them at a
            glance while you tune parameters.
          </p>
        </div>
        <ul className="space-y-3 text-sm">
          {attackModeDetails.map((mode) => {
            const active = mode.value === attackMode;
            return (
              <li
                key={mode.value}
                className={`rounded-md border p-3 transition-colors ${
                  active
                    ? 'border-kali-blue bg-kali-blue-glow/20'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {mode.value} · {mode.title}
                  </span>
                  <span aria-hidden="true" className="text-lg">
                    {mode.icon}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1 text-xs text-gray-300 mt-2"
                  aria-hidden="true"
                >
                  {mode.diagram.map((step, idx) => (
                    <React.Fragment key={`${mode.value}-diagram-${step}`}>
                      <span>{step}</span>
                      {idx < mode.diagram.length - 1 && <span>➜</span>}
                    </React.Fragment>
                  ))}
                </div>
                <ul className="list-disc list-inside text-xs text-gray-100 mt-2">
                  {mode.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

export default HashcatApp;

export const displayHashcat = () => <HashcatApp />;

