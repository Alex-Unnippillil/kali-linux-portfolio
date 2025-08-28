import React, { useState, useEffect, useRef } from 'react';
import progressInfo from './progress.json';

const hashTypes = [
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
  const workerRef = useRef(null);
  const frameRef = useRef(null);

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
    if (typeof window === 'undefined') return;
    if (window.Worker) {
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
  const info = { ...progressInfo, mode: selected.name };

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
      <div>Detected: {selectedHash}</div>
      <div>Description: {selected.description}</div>
      <div>Example hash: {selected.example}</div>
      <div>Expected output: {selected.output}</div>
      <div>Description: {selected.description}</div>
      <button onClick={runBenchmark}>Run Benchmark</button>
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
        <div className="text-xs mt-1">Uploading wordlists is disabled.</div>
      </div>
      <div className="mt-2">
        <div className="text-sm">Demo Command:</div>
        <div className="flex items-center">
          <code
            className="bg-black px-2 py-1 text-xs"
            data-testid="demo-command"
          >
            {`hashcat -m ${hashType} ${hashInput || 'hash.txt'} ${
              wordlist ? `${wordlist}.txt` : 'wordlist.txt'
            }`}
          </code>
          <button
            className="ml-2"
            onClick={() => {
              if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(
                  `hashcat -m ${hashType} ${hashInput || 'hash.txt'} ${
                    wordlist ? `${wordlist}.txt` : 'wordlist.txt'
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
      <div className="text-xs">Note: real hashcat requires a compatible GPU.</div>
      {!isCracking ? (
        <button onClick={startCracking}>Start Cracking</button>
      ) : (
        <button onClick={() => cancelCracking()}>Cancel</button>
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

