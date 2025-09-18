import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import progressInfo from './progress.json';
import StatsChart from '../../StatsChart';

export const hashTypes = [
  {
    id: '0',
    name: 'MD5',
    description: 'Raw MD5',
    regex: /^[a-f0-9]{32}$/i,
    example: '5f4dcc3b5aa765d61d8327deb882cf99',
    output: 'password',
    description: 'Fast, legacy 32-character hash',
  },
  {
    id: '100',
    name: 'SHA1',
    description: 'SHA-1',
    regex: /^[a-f0-9]{40}$/i,
    example: '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8',
    output: 'password',
    description: '160-bit secure hash algorithm',
  },
  {
    id: '1400',
    name: 'SHA256',
    description: 'SHA-256',
    regex: /^[a-f0-9]{64}$/i,
    example:
      '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    output: 'password',
    description: '256-bit SHA2 hash',
  },
  {
    id: '3200',
    name: 'bcrypt',
    description: 'bcrypt $2*$',
    regex: /^\$2[aby]\$.{56}$/,
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

const maskCharset = {
  '?l': 'abcdefghijklmnopqrstuvwxyz',
  '?u': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '?d': '0123456789',
  '?s': "!@#$%^&*()-_=+[]{};:'\",.<>/?`~",
  '?a':
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:'\",.<>/?`~",
};

const wordlistSources = [
  {
    id: 'rockyou',
    label: 'rockyou.txt (demo)',
    count: 14344392,
    preview: ['password', '123456', 'qwerty', 'letmein', 'dragon'],
  },
  {
    id: 'top100',
    label: 'top-100.txt (demo)',
    count: 100,
    preview: [
      '123456',
      '123456789',
      'password1',
      'abc123',
      'iloveyou',
    ],
  },
  {
    id: 'seclists-mini',
    label: 'SecLists small (demo)',
    count: 500,
    preview: ['welcome1', 'changeme', 'trustno1', 'summer2024', 'admin!23'],
  },
];

const combinatorRuleOptions = [
  {
    id: 'word-number',
    label: 'Common word + 2-digit number',
    left: ['password', 'summer', 'winter', 'welcome', 'dragon'],
    right: ['01', '12', '22', '42', '99'],
    joiner: '',
  },
  {
    id: 'leet-symbol',
    label: 'Leetspeak base + symbol suffix',
    left: ['p@ss', 'h4ck', 's3cur3', 'n3tw0rk', 'r00t'],
    right: ['!', '#', '$', '123', '*'],
    joiner: '',
  },
  {
    id: 'first-last-dot',
    label: 'First name + last name with dot',
    left: ['alex', 'maria', 'li', 'noah', 'fatima'],
    right: ['smith', 'garcia', 'chen', 'patel', 'singh'],
    joiner: '.',
  },
];

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

export const generateWordlist = (pattern) => {
  const results = [];
  const max = 1000;
  const helper = (prefix, rest) => {
    if (results.length >= max) return;
    if (!rest.length) {
      results.push(prefix);
      return;
    }
    const ch = rest[0];
    if (ch === '?') {
      for (let i = 0; i < 10 && results.length < max; i++) {
        helper(prefix + i, rest.slice(1));
      }
    } else {
      helper(prefix + ch, rest.slice(1));
    }
  };
  helper('', pattern || '');
  return results;
};

const buildMaskPreview = (mask, limit = 50) => {
  if (!mask) {
    return { total: 0, preview: [] };
  }
  const sets = [];
  for (let i = 0; i < mask.length; i += 1) {
    const char = mask[i];
    if (char === '?' && i < mask.length - 1) {
      const token = mask.slice(i, i + 2);
      if (maskCharset[token]) {
        sets.push(maskCharset[token].split(''));
        i += 1;
        continue;
      }
    }
    sets.push([char]);
  }
  const total = sets.reduce((acc, set) => acc * set.length, 1);
  if (!sets.length) {
    return { total: 0, preview: [] };
  }
  const indices = new Array(sets.length).fill(0);
  const preview = [];
  let finished = false;
  while (!finished && preview.length < limit) {
    preview.push(sets.map((set, idx) => set[indices[idx]]).join(''));
    let position = sets.length - 1;
    while (position >= 0) {
      indices[position] += 1;
      if (indices[position] < sets[position].length) {
        break;
      }
      indices[position] = 0;
      position -= 1;
    }
    if (position < 0) {
      finished = true;
    }
  }
  return { total, preview };
};

const buildCombinatorPreview = (config, limit = 50) => {
  const left = Array.isArray(config?.left) ? config.left : [];
  const right = Array.isArray(config?.right) ? config.right : [];
  const joiner = typeof config?.joiner === 'string' ? config.joiner : '';
  const total = left.length * right.length;
  const preview = [];
  for (let i = 0; i < left.length && preview.length < limit; i += 1) {
    for (let j = 0; j < right.length && preview.length < limit; j += 1) {
      preview.push(`${left[i]}${joiner}${right[j]}`);
    }
  }
  return { total, preview };
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
  const [wordlist, setWordlist] = useState(wordlistSources[0].id);
  const [sourceType, setSourceType] = useState('wordlist');
  const [generatedPreview, setGeneratedPreview] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [candidateStats, setCandidateStats] = useState({ count: 0, time: 0 });
  const [combinatorRule, setCombinatorRule] = useState(
    combinatorRuleOptions[0].id
  );
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [isCracking, setIsCracking] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [attackMode, setAttackMode] = useState('0');
  const [mask, setMask] = useState('');
  const appendMask = (token) => setMask((m) => m + token);
  const [ruleSet, setRuleSet] = useState('none');
  const rulePreview = (ruleSets[ruleSet] || []).slice(0, 10).join('\n');
  const [cpuDropMs, setCpuDropMs] = useState(null);
  const workerRef = useRef(null);
  const frameRef = useRef(null);
  const candidateWorkerRef = useRef(null);
  const candidateJobRef = useRef(0);
  const cpuDropTimeoutRef = useRef(null);

  const selectedWordlistMeta = useMemo(
    () => wordlistSources.find((source) => source.id === wordlist),
    [wordlist]
  );

  const selectedCombinator = useMemo(
    () =>
      combinatorRuleOptions.find((ruleOption) => ruleOption.id === combinatorRule),
    [combinatorRule]
  );

  const previewList =
    sourceType === 'wordlist'
      ? selectedWordlistMeta?.preview || []
      : generatedPreview;

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(2)}m`;
    const hours = minutes / 60;
    if (hours < 24) return `${hours.toFixed(2)}h`;
    const days = hours / 24;
    return `${days.toFixed(2)}d`;
  };

  const requestGeneratedPreview = useCallback(
    (type, payload) => {
      setCandidateStats({ count: 0, time: 0 });
      setGeneratedPreview([]);
      setSourceLoading(true);
      if (candidateWorkerRef.current) {
        candidateWorkerRef.current.postMessage({ type: 'cancel' });
      }
      candidateJobRef.current += 1;
      const jobId = candidateJobRef.current;

      if (candidateWorkerRef.current) {
        candidateWorkerRef.current.postMessage({
          id: jobId,
          type: 'generate',
          sourceType: type,
          payload,
          limit: 50,
        });
        return;
      }

      if (type === 'mask') {
        const { total, preview } = buildMaskPreview(payload?.mask || '');
        setCandidateStats({ count: total, time: total / 1_000_000 || 0 });
        setGeneratedPreview(preview);
      } else if (type === 'combinator') {
        const { total, preview } = buildCombinatorPreview(payload);
        setCandidateStats({ count: total, time: total / 1_000_000 || 0 });
        setGeneratedPreview(preview);
      }
      setSourceLoading(false);
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return;
    const worker = new Worker(new URL('./candidate.worker.js', import.meta.url));
    candidateWorkerRef.current = worker;
    worker.onmessage = ({ data }) => {
      if (!data || data.id !== candidateJobRef.current) return;
      if (typeof data.total === 'number' && !Number.isNaN(data.total)) {
        setCandidateStats({
          count: data.total,
          time: data.total / 1_000_000 || 0,
        });
      }
      if (Array.isArray(data.chunk) && data.chunk.length) {
        setGeneratedPreview((prev) => {
          const next = [...prev, ...data.chunk];
          return next.slice(0, 50);
        });
      }
      if (data.done || data.cancelled) {
        setSourceLoading(false);
      }
    };
    return () => {
      worker.postMessage({ type: 'cancel' });
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (sourceType !== 'wordlist') {
      return;
    }
    const count = selectedWordlistMeta?.count || 0;
    setCandidateStats({ count, time: count / 1_000_000 || 0 });
    setSourceLoading(false);
    setGeneratedPreview([]);
  }, [sourceType, selectedWordlistMeta]);

  useEffect(() => {
    if (sourceType !== 'mask') {
      return;
    }
    if (!mask) {
      setCandidateStats({ count: 0, time: 0 });
      setGeneratedPreview([]);
      setSourceLoading(false);
      if (candidateWorkerRef.current) {
        candidateWorkerRef.current.postMessage({ type: 'cancel' });
      }
      return;
    }
    requestGeneratedPreview('mask', { mask });
  }, [mask, sourceType, requestGeneratedPreview]);

  useEffect(() => {
    if (sourceType !== 'combinator') {
      return;
    }
    if (!selectedCombinator) {
      setCandidateStats({ count: 0, time: 0 });
      setGeneratedPreview([]);
      setSourceLoading(false);
      return;
    }
    requestGeneratedPreview('combinator', {
      left: selectedCombinator.left,
      right: selectedCombinator.right,
      joiner: selectedCombinator.joiner,
    });
  }, [sourceType, selectedCombinator, requestGeneratedPreview]);

  useEffect(() => {
    if (sourceType === 'mask' || sourceType === 'combinator') {
      return;
    }
    if (candidateWorkerRef.current) {
      candidateWorkerRef.current.postMessage({ type: 'cancel' });
    }
    candidateJobRef.current += 1;
    setSourceLoading(false);
    setGeneratedPreview([]);
  }, [sourceType]);

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

  const startCracking = () => {
    if (isCracking) return;
    const expected = selected.output;
    setIsCracking(true);
    setProgress(0);
    setResult('');
    setCpuDropMs(null);
    if (cpuDropTimeoutRef.current) {
      clearTimeout(cpuDropTimeoutRef.current);
      cpuDropTimeoutRef.current = null;
    }
    if (typeof performance !== 'undefined') {
      if (performance.clearMarks) {
        performance.clearMarks('hashcat-cancel');
        performance.clearMarks('hashcat-cpu-drop');
      }
      if (performance.clearMeasures) {
        performance.clearMeasures('hashcat-cpu-stabilize');
      }
    }
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
            cancelCracking(false, false);
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
            cancelCracking(false, false);
            return p;
          }
          frameRef.current = requestAnimationFrame(animate);
          return p + 1;
        });
      };
      frameRef.current = requestAnimationFrame(animate);
    }
  };

  const cancelCracking = (reset = true, measureDrop = true) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ cancel: true });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (candidateWorkerRef.current) {
      candidateWorkerRef.current.postMessage({ type: 'cancel' });
    }
    candidateJobRef.current += 1;
    if (cpuDropTimeoutRef.current) {
      clearTimeout(cpuDropTimeoutRef.current);
      cpuDropTimeoutRef.current = null;
    }
    setIsCracking(false);
    setSourceLoading(false);
    setGpuUsage(0);
    if (measureDrop && typeof performance !== 'undefined' && performance.mark) {
      performance.mark('hashcat-cancel');
      cpuDropTimeoutRef.current = setTimeout(() => {
        if (typeof performance === 'undefined' || !performance.mark) {
          cpuDropTimeoutRef.current = null;
          return;
        }
        performance.mark('hashcat-cpu-drop');
        const measure =
          performance.measure &&
          performance.measure(
            'hashcat-cpu-stabilize',
            'hashcat-cancel',
            'hashcat-cpu-drop'
          );
        setCpuDropMs(measure?.duration ?? 0);
        performance.clearMarks?.('hashcat-cancel');
        performance.clearMarks?.('hashcat-cpu-drop');
        performance.clearMeasures?.('hashcat-cpu-stabilize');
        cpuDropTimeoutRef.current = null;
      }, 200);
    } else if (!measureDrop) {
      setCpuDropMs(null);
    }
    if (reset) {
      setProgress(0);
      setResult('');
    }
  };

  useEffect(() => {
    return () => cancelCracking(true, false);
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

  const baseCommand = `hashcat -m ${hashType} -a ${attackMode} ${
    hashInput || 'hash.txt'
  }`;
  let sourceSegment = ' wordlist.txt';
  if (sourceType === 'mask') {
    sourceSegment = ` ${mask || '?l?l?d?d'}`;
  } else if (sourceType === 'combinator') {
    const id = selectedCombinator?.id || 'combo';
    sourceSegment = ` ${id}-left.txt ${id}-right.txt`;
  } else if (selectedWordlistMeta) {
    sourceSegment = ` ${selectedWordlistMeta.id}.txt`;
  }
  const ruleSegment = ruleSet !== 'none' ? ` -r ${ruleSet}.rule` : '';
  const demoCommand = `${baseCommand}${sourceSegment}${ruleSegment}`;

  const createWordlist = () => {
    const list = generateWordlist(pattern);
    const blob = new Blob([list.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    if (wordlistUrl) {
      URL.revokeObjectURL(wordlistUrl);
    }
    setWordlistUrl(url);
  };

  useEffect(() => {
    return () => {
      if (wordlistUrl) {
        URL.revokeObjectURL(wordlistUrl);
      }
    };
  }, [wordlistUrl]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-ub-cool-grey text-white">
      <div>
        <label className="mr-2" htmlFor="hash-input">
          Hash:
        </label>
        <input
          id="hash-input"
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
                {h.id} - {h.name} ({h.description})
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
      <div>
        <label className="mr-2" htmlFor="credential-source">
          Credential Source:
        </label>
        <select
          id="credential-source"
          className="text-black px-2 py-1"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
        >
          <option value="wordlist">Wordlist</option>
          <option value="mask">Mask pattern</option>
          <option value="combinator">Combinator rule</option>
        </select>
      </div>
      {sourceType === 'mask' && (
        <div className="w-full max-w-md">
          <label className="block" htmlFor="mask-input">
            Mask Pattern
          </label>
          <input
            id="mask-input"
            className="text-black px-2 py-1 w-full"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
          />
          <div className="space-x-2 mt-1">
            {['?l', '?u', '?d', '?s', '?a'].map((t) => (
              <button key={t} onClick={() => appendMask(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="text-xs mt-1 text-gray-200">
            Use Hashcat mask tokens such as <code>?l</code> (lowercase) or{' '}
            <code>?d</code> (digits). Patterns expand automatically in the
            background worker.
          </div>
        </div>
      )}
      {sourceType === 'combinator' && (
        <div className="w-full max-w-md">
          <label className="mr-2" htmlFor="combinator-rule">
            Combinator Rule:
          </label>
          <select
            id="combinator-rule"
            className="text-black px-2 py-1"
            value={combinatorRule}
            onChange={(e) => setCombinatorRule(e.target.value)}
          >
            {combinatorRuleOptions.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
          {selectedCombinator && (
            <div className="text-xs mt-2 space-y-1 text-gray-200">
              <div>
                Left list ({selectedCombinator.left.length}):{' '}
                {selectedCombinator.left.join(', ')}
              </div>
              <div>
                Right list ({selectedCombinator.right.length}):{' '}
                {selectedCombinator.right.join(', ')}
              </div>
              <div>
                Joiner: {selectedCombinator.joiner || '(concatenate)'}
              </div>
            </div>
          )}
        </div>
      )}
      {sourceType === 'wordlist' && (
        <div className="w-full max-w-md space-y-3">
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
              {wordlistSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
            <div className="text-xs mt-1">
              Wordlist selection is simulated. Common files live under{' '}
              <code>/usr/share/wordlists/</code> such as{' '}
              <code>/usr/share/wordlists/rockyou.txt</code>.
            </div>
            <div className="text-xs">
              Learn more at{' '}
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
          </div>
          <div>
            <label className="mr-2" htmlFor="word-pattern">
              Pattern Generator:
            </label>
            <input
              id="word-pattern"
              className="text-black px-2 py-1"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <button className="ml-2" onClick={createWordlist}>
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
            <div className="text-xs mt-1">
              The demo expands <code>?</code> to digits; uploading custom
              wordlists is disabled.
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-md bg-black/40 rounded p-3">
        <div className="text-sm font-semibold">Candidate space</div>
        <p className="mt-1 text-sm">
          Count: {candidateStats.count.toLocaleString()}
        </p>
        <p className="text-xs text-gray-200">
          Estimated @1M/s: {formatTime(candidateStats.time)}
        </p>
        <StatsChart count={candidateStats.count} time={candidateStats.time} />
        {sourceLoading && (
          <div className="text-xs italic mt-1">Generating preview...</div>
        )}
        {!sourceLoading &&
          previewList.length === 0 &&
          candidateStats.count === 0 && (
            <div className="text-xs mt-1 text-gray-300">
              {sourceType === 'mask'
                ? 'Enter a mask token like ?l?d to populate the candidate pool.'
                : sourceType === 'combinator'
                ? 'Choose a combinator rule to see generated pairs.'
                : 'Select a wordlist to inspect sample entries.'}
            </div>
          )}
        {previewList.length > 0 && (
          <div className="mt-2">
            <div className="text-sm">Preview (demo):</div>
            <pre className="bg-black p-2 text-xs h-24 overflow-auto">
              {previewList.join('\n')}
            </pre>
          </div>
        )}
        {sourceType === 'combinator' && selectedCombinator && (
          <div className="text-xs mt-1 text-gray-200">
            {selectedCombinator.left.length} × {selectedCombinator.right.length} ={' '}
            {candidateStats.count.toLocaleString()} combinations
          </div>
        )}
        {sourceType === 'mask' && mask && (
          <div className="text-xs mt-1 text-gray-200">
            Mask length: {mask.length} characters
          </div>
        )}
      </div>
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
      <div>Description: {selected.description}</div>
      <div>Example hash: {selected.example}</div>
      <div>Expected output: {selected.output}</div>
      <div>Description: {selected.description}</div>
      <button onClick={runBenchmark}>Run Benchmark</button>
      {benchmark && (
        <div data-testid="benchmark-output">{benchmark}</div>
      )}
      <div className="mt-2">
        <div className="text-sm">Demo Command:</div>
        <div className="flex items-center">
          <code
            className="bg-black px-2 py-1 text-xs"
            data-testid="demo-command"
          >
            {demoCommand}
          </code>
          <button
            className="ml-2"
            onClick={() => {
              if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(demoCommand);
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
        <button onClick={startCracking}>Start Cracking</button>
      ) : (
        <button onClick={() => cancelCracking()}>Cancel</button>
      )}
      {cpuDropMs !== null && (
        <div
          className={`text-xs ${
            cpuDropMs <= 200 ? 'text-green-300' : 'text-yellow-300'
          }`}
        >
          CPU load stabilized in {cpuDropMs.toFixed(0)} ms (target ≤ 200 ms)
        </div>
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
  );
}

export default HashcatApp;

export const displayHashcat = () => <HashcatApp />;

