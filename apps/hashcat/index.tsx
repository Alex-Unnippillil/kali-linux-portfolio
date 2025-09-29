'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import RulesSandbox from './components/RulesSandbox';
import StatsChart from '../../components/StatsChart';
import type {
  BenchmarkPresetConfig,
  BenchmarkStartPayload,
  BenchmarkWorkerOutgoingMessage,
} from './worker-types';

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

const benchmarkPresets: BenchmarkPresetConfig[] = [
  {
    key: 'quick-audit',
    label: 'Quick Audit',
    description: 'Short dictionary sweep for safe demos and walkthroughs.',
    durationMs: 15000,
    steps: 40,
    speedRange: [2100, 2800],
    recoveredHashes: 1,
    sampleLogs: [
      'Loaded curated wordlist (52,360 candidates)',
      'GPU0 applying best64 ruleset',
      'GPU0 queue depth stable, monitoring temps',
    ],
    scenario: 'Quick audit',
  },
  {
    key: 'mask-check',
    label: 'Mask Stress Test',
    description: 'Moderate mask benchmark to validate keyspace planning.',
    durationMs: 25000,
    steps: 50,
    speedRange: [3200, 4200],
    recoveredHashes: 1,
    sampleLogs: [
      'Enumerating ?l?l?d?d combinations',
      'GPU0: mask scheduler adjusting chunk size',
      'Rule cache warmed, continuing sweep',
    ],
    scenario: 'Mask evaluation',
  },
  {
    key: 'hybrid-sweep',
    label: 'Hybrid Sweep',
    description: 'Combines dictionary + mask combos for realistic hybrid runs.',
    durationMs: 35000,
    steps: 60,
    speedRange: [3600, 5200],
    recoveredHashes: 2,
    sampleLogs: [
      'Loading base dictionary with appended masks',
      'GPU0 switching to combinator stage',
      'Heuristic: promoting successful rule combinations',
    ],
    scenario: 'Hybrid sweep',
  },
  {
    key: 'extreme',
    label: 'Extreme Stress (Heavy)',
    description:
      'Extended simulation that mimics intensive GPU benchmarking. Disabled unless explicitly allowed.',
    durationMs: 60000,
    steps: 80,
    speedRange: [4200, 6000],
    recoveredHashes: 3,
    sampleLogs: [
      'GPU0 fans ramped to 80% duty cycle',
      'Scheduler throttled to maintain safe temperatures',
      'Long-run stability checkpoint passed',
    ],
    scenario: 'Extreme stress',
    heavy: true,
  },
];

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
  const [eta, setEta] = useState('--:--');
  const [recovered, setRecovered] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [benchmarkSummary, setBenchmarkSummary] = useState(
    'Select a preset and start a benchmark to view simulated performance.',
  );
  const workerRef = useRef<Worker | null>(null);

  const [allowHeavyPresets, setAllowHeavyPresets] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState(
    benchmarkPresets[0].key,
  );

  const selectedPreset = useMemo(
    () =>
      benchmarkPresets.find((preset) => preset.key === selectedPresetKey) ||
      benchmarkPresets[0],
    [selectedPresetKey],
  );
  const total = selectedPreset.recoveredHashes;
  const startDisabled = !running && selectedPreset.heavy && !allowHeavyPresets;
  const presetSelectId = 'hashcat-benchmark-preset';
  const heavyToggleId = 'hashcat-heavy-toggle';

  useEffect(() => {
    if (!allowHeavyPresets && selectedPreset.heavy) {
      const fallback = benchmarkPresets.find((preset) => !preset.heavy);
      if (fallback) {
        setSelectedPresetKey(fallback.key);
      }
    }
  }, [allowHeavyPresets, selectedPreset]);

  const handleWorkerMessage = useCallback(
    ({ data }: MessageEvent<BenchmarkWorkerOutgoingMessage>) => {
      if (data.type === 'progress') {
        setProgress(data.progress);
        setEta(data.eta);
        setCurrentSpeed(data.speed);
        setRecovered(data.recovered);
        setLogs((prev) =>
          [...prev.slice(-19), `${data.scenario}: ${data.log}`],
        );
        return;
      }

      if (data.type === 'complete') {
        setProgress(100);
        setEta('00:00');
        setRunning(false);
        setRecovered(data.recovered);
        setBenchmarkSummary(data.summary);
        setLogs((prev) => [...prev.slice(-19), `${data.scenario}: completed`]);
        return;
      }

      if (data.type === 'stopped') {
        setRunning(false);
        setEta('00:00');
        setBenchmarkSummary(`Benchmark for ${data.scenario} stopped.`);
        setLogs((prev) => [...prev.slice(-19), `${data.scenario}: stop acknowledged`]);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }
    const worker = new Worker(
      new URL('../../workers/hashcatBenchmark.worker.ts', import.meta.url),
    );
    workerRef.current = worker;
    worker.onmessage = handleWorkerMessage;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [handleWorkerMessage]);

  const start = () => {
    if (running) return;
    if (selectedPreset.heavy && !allowHeavyPresets) {
      setBenchmarkSummary('Enable heavy presets to run this scenario.');
      return;
    }
    if (!workerRef.current) {
      setBenchmarkSummary('Web Workers are unavailable in this environment.');
      return;
    }

    const payload: BenchmarkStartPayload = {
      scenario: selectedPreset.scenario,
      durationMs: selectedPreset.durationMs,
      steps: selectedPreset.steps,
      speedRange: selectedPreset.speedRange,
      recoveredHashes: selectedPreset.recoveredHashes,
      sampleLogs: selectedPreset.sampleLogs,
    };

    setRunning(true);
    setProgress(0);
    setRecovered(0);
    setCurrentSpeed(0);
    setEta('--:--');
    setLogs([`Starting ${selectedPreset.scenario} preset`]);
    setBenchmarkSummary(`Benchmark running: ${selectedPreset.label}`);
    workerRef.current.postMessage({ type: 'start', payload });
  };

  const stop = () => {
    if (!running) return;
    setRunning(false);
    setBenchmarkSummary(`Stop requested for ${selectedPreset.scenario} benchmark.`);
    setEta('00:00');
    setCurrentSpeed(0);
    setLogs((prev) => [...prev.slice(-19), 'Stop requested']);
    workerRef.current?.postMessage({ type: 'stop' });
  };

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
          <label className="block mb-1">Mask</label>
          <input
            type="text"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
            className="text-black p-1 w-full font-mono mb-2"
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
        <label className="block mb-1">Hash</label>
        <div className="flex space-x-2">
          <input
            type={showHash ? 'text' : 'password'}
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            className="text-black p-1 w-full font-mono"
            placeholder="Paste hash here"
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
        <label className="block mb-1">Dictionaries</label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={dictInput}
            onChange={(e) => setDictInput(e.target.value)}
            className="text-black p-1 flex-1"
            placeholder="rockyou.txt"
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

      <div className="space-y-2">
        <div>
          <label className="block mb-1" htmlFor={presetSelectId}>
            Benchmark Preset
          </label>
          <select
            id={presetSelectId}
            value={selectedPresetKey}
            onChange={(e) => setSelectedPresetKey(e.target.value)}
            className="text-black p-2 rounded w-full"
          >
            {benchmarkPresets.map((preset) => (
              <option
                key={preset.key}
                value={preset.key}
                disabled={preset.heavy && !allowHeavyPresets}
              >
                {preset.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-300 mt-1">{selectedPreset.description}</p>
          <p className="text-xs text-gray-400">
            Est. duration: {(selectedPreset.durationMs / 1000).toFixed(0)}s · Target
            recoveries: {selectedPreset.recoveredHashes}
          </p>
          {selectedPreset.heavy && !allowHeavyPresets && (
            <p className="text-xs text-amber-300 mt-1">
              Heavy presets are gated by default. Toggle the safety switch below to
              enable them.
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm" htmlFor={heavyToggleId}>
          <input
            id={heavyToggleId}
            type="checkbox"
            checked={allowHeavyPresets}
            onChange={(e) => setAllowHeavyPresets(e.target.checked)}
          />
          Allow intensive GPU-sized benchmarks
        </label>
        <div className="space-y-1">
          <button
            type="button"
            onClick={running ? stop : start}
            disabled={startDisabled}
            className={`px-4 py-2 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 ${
              running
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-green-600 hover:bg-green-500'
            } ${startDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {running ? 'Stop Benchmark' : 'Start Benchmark'}
          </button>
          <p className="text-sm text-gray-300" data-testid="benchmark-summary">
            {benchmarkSummary}
          </p>
          <p className="text-xs text-gray-400">
            Current speed: {currentSpeed ? `${currentSpeed} MH/s` : '--'}
          </p>
        </div>
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

