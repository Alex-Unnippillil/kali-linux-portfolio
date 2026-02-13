import React, { useState, useEffect, useRef } from 'react';
import progressInfo from './progress.json';
import StatsChart from '../../StatsChart';
import RuleEditor from './RuleEditor';

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

const sampleWordlists = {
  default: ['password', 'letmein', 'summer2024', 'trustno1', 'welcome'],
  rockyou: ['password', 'dragon', 'qwerty', 'princess', 'iloveyou'],
  top100: ['123456', 'password1', 'monkey', 'shadow', 'football'],
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
  const [ruleText, setRuleText] = useState('');
  const [ruleMetrics, setRuleMetrics] = useState({
    validRules: [],
    errors: [],
    uniqueCandidateCount: 0,
    preview: [],
    truncated: false,
  });
  const workerRef = useRef(null);
  const frameRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

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

  useEffect(() => {
    if (!isCracking) {
      setElapsed(0);
      return;
    }
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 250);
    return () => clearInterval(interval);
  }, [isCracking]);

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
  const sampleWords = sampleWordlists[wordlist] || sampleWordlists.default;
  const sampleLabel = wordlist ? `${wordlist}.txt` : 'demo wordlist';
  const ruleArgument =
    ruleSet === 'custom'
      ? ruleMetrics.validRules.length
        ? ' -r demo-custom.rule'
        : ''
      : ruleSet !== 'none'
      ? ` -r ${ruleSet}.rule`
      : '';

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

  const handleRuleSetChange = (value) => {
    setRuleSet(value);
    if (value !== 'custom') {
      const presetRules = ruleSets[value] || [];
      setRuleText(presetRules.join('\n'));
    }
  };

  const handleRuleTextChange = (value) => {
    setRuleText(value);
    if (ruleSet !== 'custom') {
      setRuleSet('custom');
    }
  };

  const handleRuleEditorUpdate = (update) => {
    setRuleMetrics(update);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-ub-cool-grey text-white">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Hashcat Simulator</h1>
        <button
          type="button"
          onClick={() => setShowHelp((prev) => !prev)}
          className="rounded border border-white/10 px-3 py-1 text-xs text-white/80 hover:text-white"
          aria-expanded={showHelp}
        >
          {showHelp ? 'Hide' : 'About this tool'}
        </button>
        {showHelp && (
          <div className="rounded border border-white/10 bg-ub-grey/70 p-3 text-xs text-white/80">
            <p className="font-semibold text-white">Learning notes</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>
                Hashcat tests password candidates against hashes; higher speeds
                mean faster keyspace coverage.
              </li>
              <li>
                Try different attack modes to see how wordlists and masks affect
                the estimated keyspace.
              </li>
              <li>
                Output is simulated and does not use real GPU hardware.
              </li>
            </ul>
          </div>
        )}
      </div>
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
          onChange={(e) => handleRuleSetChange(e.target.value)}
        >
          <option value="none">None</option>
          <option value="best64">best64</option>
          <option value="quick">quick</option>
          <option value="custom">Custom</option>
        </select>
        <div className="text-xs mt-2 text-ubt-grey max-w-xl">
          Preset selections load their contents into the editor. Changing the
          text automatically switches to the custom profile for this session.
        </div>
        <RuleEditor
          value={ruleText}
          onChange={handleRuleTextChange}
          onRulesUpdate={handleRuleEditorUpdate}
          sampleWords={sampleWords}
          sampleLabel={sampleLabel}
        />
        {ruleSet === 'custom' && (
          <div className="text-xs mt-2 text-ubt-grey max-w-xl">
            {ruleMetrics.validRules.length
              ? `${ruleMetrics.validRules.length} valid rule${
                  ruleMetrics.validRules.length === 1 ? '' : 's'
                } will be included in the demo command.`
              : 'Add valid rules above to include them in the demo command.'}
            {ruleMetrics.errors.length
              ? ' Fix the highlighted lines to use them here.'
              : ''}
          </div>
        )}
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
            }${ruleArgument}`}
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
                  }${ruleArgument}`
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
        progress={progress}
        info={info}
        reduceMotion={prefersReducedMotion}
      />
      {isCracking && (
        <div className="text-xs text-white/80">
          Elapsed time: {formatTime(elapsed)}
        </div>
      )}
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
