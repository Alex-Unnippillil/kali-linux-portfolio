'use client';

import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import RulesSandbox from './components/RulesSandbox';
import StatsChart from '../../components/StatsChart';
import LabMode from '../../components/LabMode';
import rawDatasets from '../../components/apps/hashcat/datasets';

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

interface HashDatasetEntry {
  id: string;
  hash: string;
  plaintext: string;
  classification: string;
  remediation: string;
}

interface HashDataset {
  id: string;
  label: string;
  hashType: string;
  summary: string;
  origin: string;
  analysis: string;
  demoWordlist: string;
  entries: HashDatasetEntry[];
}

const datasets = rawDatasets as HashDataset[];

const sanitizeHashArg = (value: string) =>
  (value || '').replace(/[^A-Za-z0-9$./:@_-]/g, '');
const sanitizeWordlistArg = (value: string) =>
  (value || '').replace(/[^A-Za-z0-9_./-]/g, '');
const sanitizeRuleArg = (value: string) =>
  (value || '').replace(/[^A-Za-z0-9_.-]/g, '');
const sanitizeMaskArg = (value: string) =>
  (value || '').replace(/[^A-Za-z0-9?]/g, '');

const decodeHashValue = (hashValue: string | undefined | null) => {
  if (!hashValue) {
    return null;
  }
  const normalized = hashValue.toLowerCase();
  for (const dataset of datasets) {
    const entry = dataset.entries.find(
      (item) => item.hash.toLowerCase() === normalized,
    );
    if (entry) {
      return { dataset, entry };
    }
  }
  return null;
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
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const [sampleId, setSampleId] = useState(
    datasets[0]?.entries[0]?.id ?? '',
  );
  const [labCopyNotice, setLabCopyNotice] = useState('');
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

  useEffect(() => {
    const dataset = datasets.find((item) => item.id === datasetId);
    if (!dataset) {
      return;
    }
    const exists = dataset.entries.some((entry) => entry.id === sampleId);
    if (!exists) {
      const first = dataset.entries[0];
      if (first) {
        setSampleId(first.id);
      }
    }
  }, [datasetId, sampleId]);

  const dataset =
    datasets.find((item) => item.id === datasetId) ?? datasets[0];
  const datasetEntry =
    dataset?.entries.find((item) => item.id === sampleId) ||
    dataset?.entries[0];
  const decodedSelection = decodeHashValue(datasetEntry?.hash);
  const safeHashValue = sanitizeHashArg(
    hashInput || datasetEntry?.hash || 'hash.txt',
  );
  const primaryWordlist =
    dictionaries[0] || dataset?.demoWordlist || 'wordlist.txt';
  const safeWordlist = sanitizeWordlistArg(primaryWordlist);
  const safeMask = showMask ? sanitizeMaskArg(mask) : '';
  const safeRule =
    ruleSet !== 'none' ? sanitizeRuleArg(`${ruleSet}.rule`) : '';
  const safeCommandParts = [
    'hashcat',
    '-m',
    dataset?.hashType ?? '0',
    '-a',
    attackMode,
    safeHashValue || 'hash.txt',
    safeWordlist || 'wordlist.txt',
  ];
  if (safeMask) {
    safeCommandParts.push(safeMask);
  }
  if (safeRule) {
    safeCommandParts.push('-r', safeRule);
  }
  const safeCommand = safeCommandParts.join(' ');

  useEffect(() => {
    if (labCopyNotice) {
      setLabCopyNotice('');
    }
  }, [safeCommand]);

  // progress and eta are displayed in a neutral banner

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl">Hashcat Simulator</h1>

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
      <LabMode>
        <div className="mt-4 space-y-4 rounded border border-white/20 bg-black/40 p-4 text-xs text-white sm:text-sm">
          <section className="space-y-2" aria-label="hash datasets">
            <h3 className="font-semibold text-ubt-grey">Hash sample datasets</h3>
            <p className="text-gray-200">
              These hashes were generated locally from common password lists for training.
            </p>
            <label className="block" htmlFor="hashcat-dataset-page-select">
              Dataset
            </label>
            <select
              id="hashcat-dataset-page-select"
              className="w-full rounded bg-black/60 px-2 py-1 text-white"
              value={dataset?.id ?? ''}
              onChange={(event) => {
                setDatasetId(event.target.value);
              }}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <label className="block" htmlFor="hashcat-sample-page-select">
              Sample hash
            </label>
            <select
              id="hashcat-sample-page-select"
              className="w-full rounded bg-black/60 px-2 py-1 text-white"
              value={datasetEntry?.id ?? ''}
              onChange={(event) => {
                setSampleId(event.target.value);
              }}
            >
              {(dataset?.entries || []).map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.plaintext} ({entry.hash.slice(0, 8)}…)
                </option>
              ))}
            </select>
            <div className="rounded bg-black/60 p-3 text-[11px] text-gray-200">
              <p>
                <span className="font-semibold text-ubt-grey">Summary:</span> {dataset?.summary}
              </p>
              <p>
                <span className="font-semibold text-ubt-grey">Origin:</span> {dataset?.origin}
              </p>
            </div>
          </section>
          <section className="space-y-2" aria-label="safe command">
            <h3 className="font-semibold text-ubt-grey">Safe Command Builder</h3>
            <p className="text-gray-200">
              Sanitized parameters keep this lab output read-only.
            </p>
            <code className="block whitespace-pre-wrap rounded bg-black px-3 py-2 text-xs" data-testid="lab-command-page">
              {safeCommand}
            </code>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded bg-ub-green px-2 py-1 text-xs font-semibold text-black"
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(safeCommand);
                    setLabCopyNotice('Copied to clipboard');
                  } else {
                    setLabCopyNotice('Clipboard access unavailable');
                  }
                }}
              >
                Copy
              </button>
              {labCopyNotice && (
                <span className="text-[11px] text-gray-200">{labCopyNotice}</span>
              )}
            </div>
            <div className="text-[11px] text-gray-200">
              Hash source: <code>{datasetEntry?.hash}</code> →{' '}
              <span className="font-semibold text-white">{datasetEntry?.plaintext}</span>
            </div>
          </section>
          <section className="space-y-2" aria-label="result interpretation">
            <h3 className="font-semibold text-ubt-grey">Result interpretation</h3>
            {decodedSelection ? (
              <div className="space-y-2 text-[11px] text-gray-200">
                <p>
                  <span className="font-semibold text-ubt-grey">Dataset:</span> {decodedSelection.dataset.label} (mode {decodedSelection.dataset.hashType})
                </p>
                <p>
                  <span className="font-semibold text-ubt-grey">Plaintext:</span> {decodedSelection.entry.plaintext}
                </p>
                <p>
                  <span className="font-semibold text-ubt-grey">Classification:</span> {decodedSelection.entry.classification}
                </p>
                <p>
                  <span className="font-semibold text-ubt-grey">Remediation:</span> {decodedSelection.entry.remediation}
                </p>
                <p>{decodedSelection.dataset.analysis}</p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-200">Select a dataset entry to review its impact.</p>
            )}
          </section>
        </div>
      </LabMode>
    </div>
  );
};

export default Hashcat;

