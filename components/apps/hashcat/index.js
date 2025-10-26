import React, { useState, useEffect, useRef, useCallback } from 'react';
import progressInfo from './progress.json';
import StatsChart from '../../StatsChart';
import {
  AdaptiveSmoother,
  createStaticConfidence,
  getPresetById,
  SMOOTHING_PRESETS,
  TICK_INTERVAL_MS,
} from './smoothing';

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

const ProgressGauge = ({
  progress,
  info,
  reduceMotion,
  confidence,
  etaSeconds,
  etaConfidence,
  attemptsPerSecond,
  isCracking,
}) => {
  const hashRates = Array.isArray(info.hashRate)
    ? info.hashRate
    : [info.hashRate];
  const etas = Array.isArray(info.eta) ? info.eta : [info.eta];
  const recovered = Array.isArray(info.recovered)
    ? info.recovered
    : [info.recovered];
  const [index, setIndex] = useState(0);
  const resolvedProgress = Number(progress ?? 0);
  const sanitizedProgress = Number.isFinite(resolvedProgress)
    ? Math.max(0, Math.min(100, Number(resolvedProgress.toFixed(2))))
    : 0;
  const hasConfidence =
    confidence &&
    Number.isFinite(confidence.lower) &&
    Number.isFinite(confidence.upper);

  const hasLiveEta = Number.isFinite(etaSeconds);
  const liveAttempts = Number.isFinite(attemptsPerSecond)
    ? `${attemptsPerSecond.toFixed(2)} H/s`
    : null;

  const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds)) return 'N/A';
    const total = Math.max(0, seconds);
    if (total < 1) {
      return `${total.toFixed(2)}s`;
    }
    if (total < 60) {
      return `${total.toFixed(1)}s`;
    }
    const minutes = total / 60;
    if (minutes < 60) {
      return `${minutes.toFixed(2)}m`;
    }
    const hours = minutes / 60;
    if (hours < 24) {
      return `${hours.toFixed(2)}h`;
    }
    const days = hours / 24;
    return `${days.toFixed(2)}d`;
  };

  const shouldShowProgressRange =
    hasConfidence &&
    (isCracking || confidence.lower !== confidence.upper);
  const progressRangeDisplay = shouldShowProgressRange
    ? `${confidence.lower.toFixed(1)}% – ${confidence.upper.toFixed(1)}%`
    : null;
  const shouldShowEtaRange =
    hasLiveEta &&
    etaConfidence &&
    (isCracking || etaConfidence.lower !== etaConfidence.upper);
  const etaRangeDisplay = shouldShowEtaRange
    ? `${formatDuration(etaConfidence.lower)} – ${formatDuration(
        etaConfidence.upper
      )}`
    : null;

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
      aria-valuenow={sanitizedProgress}
      aria-valuetext={`${sanitizedProgress}%`}
    >
      <div className="text-sm mb-1">Progress: {sanitizedProgress}%</div>
      <div className="w-full h-4 bg-gray-700 rounded">
        <div
          className="h-4 bg-blue-600 rounded"
          style={{ width: `${sanitizedProgress}%` }}
        />
      </div>
      <div role="status" aria-live="polite" className="text-sm mt-2">
        <div>
          Attempts/sec: {liveAttempts ?? hashRates[index]}
        </div>
        <div>ETA: {hasLiveEta ? formatDuration(etaSeconds) : etas[index]}</div>
        <div>Recovered: {recovered[index]}</div>
        <div>Mode: {info.mode}</div>
        {progressRangeDisplay && (
          <div className="mt-1">95% progress range: {progressRangeDisplay}</div>
        )}
        {etaRangeDisplay && (
          <div className="mt-1">95% ETA range: {etaRangeDisplay}</div>
        )}
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
  const [progress, setProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [progressConfidence, setProgressConfidence] = useState(null);
  const [displayEtaSeconds, setDisplayEtaSeconds] = useState(null);
  const [etaConfidence, setEtaConfidence] = useState(null);
  const [attemptsPerSecond, setAttemptsPerSecond] = useState(null);
  const [result, setResult] = useState('');
  const [isCracking, setIsCracking] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [attackMode, setAttackMode] = useState('0');
  const [mask, setMask] = useState('');
  const appendMask = (token) => setMask((m) => m + token);
  const [maskStats, setMaskStats] = useState({ count: 0, time: 0 });
  const showMask = ['3', '6', '7'].includes(attackMode);
  const [ruleSet, setRuleSet] = useState('none');
  const [smoothingPreset, setSmoothingPreset] = useState('balanced');
  const rulePreview = (ruleSets[ruleSet] || []).slice(0, 10).join('\n');
  const workerRef = useRef(null);
  const frameRef = useRef({ id: null, type: null });
  const smoothingRef = useRef({ progress: null, eta: null });
  const targetRef = useRef(progressInfo.progress);

  const clearScheduledFrame = useCallback(() => {
    if (frameRef.current?.id !== null) {
      if (frameRef.current.type === 'timeout') {
        clearTimeout(frameRef.current.id);
      } else if (frameRef.current.type === 'frame') {
        cancelAnimationFrame(frameRef.current.id);
      }
      frameRef.current = { id: null, type: null };
    }
  }, []);

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
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleSmoothingChange = useCallback(
    (nextPresetId) => {
      setSmoothingPreset(nextPresetId);
      if (!isCracking) return;
      const preset = getPresetById(nextPresetId);
      const progressSmoother = new AdaptiveSmoother({
        alpha: preset.alpha,
        windowSize: preset.windowSize,
      });
      progressSmoother.update(progress);
      const etaSmoother = new AdaptiveSmoother({
        alpha: Math.min(0.9, preset.alpha + 0.1),
        windowSize: preset.windowSize,
      });
      if (Number.isFinite(displayEtaSeconds)) {
        etaSmoother.update(displayEtaSeconds);
      }
      smoothingRef.current = {
        progress: progressSmoother,
        eta: etaSmoother,
      };
    },
    [displayEtaSeconds, isCracking, progress]
  );

  const cancelCracking = useCallback(
    (reset = true) => {
      if (workerRef.current) {
        workerRef.current.postMessage({ cancel: true });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      clearScheduledFrame();
      smoothingRef.current = { progress: null, eta: null };
      setIsCracking(false);
      if (reset) {
        setProgress(0);
        setDisplayProgress(0);
        setProgressConfidence(null);
        setDisplayEtaSeconds(null);
        setEtaConfidence(null);
        setAttemptsPerSecond(null);
        setResult('');
      }
    },
    [clearScheduledFrame]
  );

  const applyProgressUpdate = useCallback(
    (payload, expectedValue) => {
      const progressBounds = { min: 0, max: targetRef.current };
      const etaBounds = {
        min: 0,
        max: targetRef.current * (TICK_INTERVAL_MS / 1000),
      };

      const nextProgress = Number.isFinite(payload.progress)
        ? payload.progress
        : 0;
      const nextEta = Number.isFinite(payload.etaSeconds)
        ? payload.etaSeconds
        : etaBounds.max;

      setProgress(nextProgress);

      const progressSmoother = smoothingRef.current.progress;
      const etaSmoother = smoothingRef.current.eta;

      const smoothedProgress = progressSmoother
        ? progressSmoother.update(nextProgress)
        : nextProgress;
      const progressInterval = progressSmoother
        ? progressSmoother.getConfidenceInterval(0.95, progressBounds)
        : createStaticConfidence(nextProgress, progressBounds);

      const smoothedEta = etaSmoother ? etaSmoother.update(nextEta) : nextEta;
      const etaInterval = etaSmoother
        ? etaSmoother.getConfidenceInterval(0.95, etaBounds)
        : createStaticConfidence(nextEta, etaBounds);

      const progressValue = Number.isFinite(progressInterval?.smoothed)
        ? progressInterval.smoothed
        : Number.isFinite(smoothedProgress)
        ? smoothedProgress
        : nextProgress;
      const etaValue = Number.isFinite(etaInterval?.smoothed)
        ? etaInterval.smoothed
        : Number.isFinite(smoothedEta)
        ? smoothedEta
        : nextEta;

      setDisplayProgress(progressValue);
      setProgressConfidence(progressInterval);
      setDisplayEtaSeconds(etaValue);
      setEtaConfidence(etaInterval);
      setAttemptsPerSecond(
        Number.isFinite(payload.attemptsPerSecond)
          ? payload.attemptsPerSecond
          : null
      );

      if (payload.complete) {
        setResult(expectedValue);
        setDisplayProgress(progressBounds.max);
        setProgressConfidence(
          createStaticConfidence(progressBounds.max, progressBounds)
        );
        setDisplayEtaSeconds(0);
        setEtaConfidence(createStaticConfidence(0, etaBounds));
        cancelCracking(false);
      }
    },
    [cancelCracking]
  );

  const startCracking = () => {
    if (isCracking) return;
    const expected = selected.output;
    const preset = getPresetById(smoothingPreset);
    smoothingRef.current = {
      progress: new AdaptiveSmoother({
        alpha: preset.alpha,
        windowSize: preset.windowSize,
      }),
      eta: new AdaptiveSmoother({
        alpha: Math.min(0.9, preset.alpha + 0.1),
        windowSize: preset.windowSize,
      }),
    };
    frameRef.current = { id: null, type: null };
    setIsCracking(true);
    setProgress(0);
    setDisplayProgress(0);
    setProgressConfidence(null);
    setDisplayEtaSeconds(null);
    setEtaConfidence(null);
    setAttemptsPerSecond(null);
    setResult('');
    if (typeof window === 'undefined') return;
    const totalTarget = targetRef.current;
    if (typeof Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./progress.worker.js', import.meta.url)
      );
      workerRef.current.postMessage({ target: totalTarget });
      workerRef.current.onmessage = ({ data }) => {
        const update = () => applyProgressUpdate(data, expected);
        if (prefersReducedMotion) {
          clearScheduledFrame();
          update();
        } else {
          clearScheduledFrame();
          frameRef.current = {
            id: requestAnimationFrame(update),
            type: 'frame',
          };
        }
      };
    } else {
      const start = Date.now();
      let current = 0;
      const fallbackTick = () => {
        current = Math.min(totalTarget, current + 1);
        const elapsedMs = Date.now() - start;
        const payload = {
          progress: current,
          etaSeconds: Math.max(
            0,
            (totalTarget - current) * (TICK_INTERVAL_MS / 1000)
          ),
          attemptsPerSecond: current
            ? (current / Math.max(1, elapsedMs)) * 1000
            : 0,
          complete: current >= totalTarget,
        };
        applyProgressUpdate(payload, expected);
        if (!payload.complete) {
          clearScheduledFrame();
          frameRef.current = {
            id: window.setTimeout(fallbackTick, TICK_INTERVAL_MS),
            type: 'timeout',
          };
        }
      };
      fallbackTick();
    }
  };

  useEffect(() => {
    return () => cancelCracking();
  }, [cancelCracking]);

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

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-ub-cool-grey text-white">
      <div>
        <label className="mr-2" htmlFor="hash-input">
          Hash:
        </label>
        <input
          id="hash-input"
          type="text"
          aria-label="Hash value"
          className="text-black px-2 py-1"
          value={hashInput}
          onChange={handleHashChange}
        />
      </div>
      <div>
        <label className="mr-2" htmlFor="hash-filter">
          Filter Modes:
        </label>
        <input
          id="hash-filter"
          type="text"
          aria-label="Filter hash modes"
          className="text-black px-2 py-1"
          value={hashFilter}
          onChange={(e) => setHashFilter(e.target.value)}
        />
      </div>
      <div>
        <label className="mr-2" htmlFor="hash-type">
          Hash Type:
        </label>
        <select
          id="hash-type"
          className="text-black px-2 py-1"
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
        <label className="mr-2" htmlFor="attack-mode">
          Attack Mode:
        </label>
        <select
          id="attack-mode"
          className="text-black px-2 py-1"
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
      {showMask && (
        <div>
          <label className="block" htmlFor="mask-input">
            Mask
          </label>
          <input
            id="mask-input"
            type="text"
            aria-label="Mask pattern"
            className="text-black px-2 py-1 w-full"
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
      <div>Detected: {selectedHash}</div>
      <div>Summary: {selected.summary}</div>
      <div>Example hash: {selected.example}</div>
      <div>Expected output: {selected.output}</div>
      <div>Description: {selected.description}</div>
      <button type="button" onClick={runBenchmark}>
        Run Benchmark
      </button>
      {benchmark && (
        <div data-testid="benchmark-output">{benchmark}</div>
      )}
      <div>
        <label className="mr-2" htmlFor="wordlist-select">
          Wordlist:
        </label>
        <select
          id="wordlist-select"
          className="text-black px-2 py-1"
          value={wordlist}
          onChange={(e) => setWordlist(e.target.value)}
        >
          <option value="">Select wordlist (demo)</option>
          <option value="rockyou">rockyou.txt</option>
          <option value="top100">top-100.txt</option>
        </select>
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
        <div className="flex items-center">
          <code
            className="bg-black px-2 py-1 text-xs"
            data-testid="demo-command"
          >
            {`hashcat -m ${hashType} -a ${attackMode} ${
              hashInput || 'hash.txt'
            } ${wordlist ? `${wordlist}.txt` : 'wordlist.txt'}${
              showMask && mask ? ` ${mask}` : ''
            }${ruleSet !== 'none' ? ` -r ${ruleSet}.rule` : ''}`}
          </code>
          <button
            className="ml-2"
            type="button"
            onClick={() => {
              if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(
                  `hashcat -m ${hashType} -a ${attackMode} ${
                    hashInput || 'hash.txt'
                  } ${wordlist ? `${wordlist}.txt` : 'wordlist.txt'}${
                    showMask && mask ? ` ${mask}` : ''
                  }${ruleSet !== 'none' ? ` -r ${ruleSet}.rule` : ''}`
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
      <div>
        <label className="mr-2" htmlFor="smoothing-level">
          Smoothing level:
        </label>
        <select
          id="smoothing-level"
          className="text-black px-2 py-1"
          value={smoothingPreset}
          onChange={(e) => handleSmoothingChange(e.target.value)}
        >
          {Object.values(SMOOTHING_PRESETS).map((presetOption) => (
            <option key={presetOption.id} value={presetOption.id}>
              {presetOption.label}
            </option>
          ))}
        </select>
        <div className="text-xs mt-1 max-w-md">
          Adjust smoothing aggressiveness so progress and ETA updates stay
          readable at 50ms intervals.
        </div>
      </div>
      <Gauge value={gpuUsage} />
      <div className="text-xs">Note: real hashcat requires a compatible GPU.</div>
      {!isCracking ? (
        <button type="button" onClick={startCracking}>
          Start Cracking
        </button>
      ) : (
        <button type="button" onClick={() => cancelCracking()}>
          Cancel
        </button>
      )}
      <ProgressGauge
        progress={displayProgress}
        info={info}
        reduceMotion={prefersReducedMotion}
        confidence={progressConfidence}
        etaSeconds={displayEtaSeconds}
        etaConfidence={etaConfidence}
        attemptsPerSecond={attemptsPerSecond}
        isCracking={isCracking}
      />
      {result && <div>Result: {result}</div>}
      <pre className="bg-black text-green-400 p-2 rounded text-xs w-full max-w-md overflow-x-auto mt-4">
        {sampleOutput}
      </pre>
      <div className="text-xs mt-4">
        This tool simulates hash cracking for educational purposes only.
      </div>
    </div>
  );
}

export default HashcatApp;

export const displayHashcat = () => <HashcatApp />;

