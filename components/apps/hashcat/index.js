import React, { useState, useEffect, useRef } from 'react';
import progressInfo from './progress.json';
import SecurityDisclaimer from '../../SecurityDisclaimer';

const hashTypes = [
  { id: '0', name: 'MD5', regex: /^[a-f0-9]{32}$/i },
  { id: '100', name: 'SHA1', regex: /^[a-f0-9]{40}$/i },
  { id: '1400', name: 'SHA256', regex: /^[a-f0-9]{64}$/i },
  { id: '3200', name: 'bcrypt', regex: /^\$2[aby]\$.{56}$/ },
];

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

function HashcatApp() {
  const [hashType, setHashType] = useState(hashTypes[0].id);
  const [hashInput, setHashInput] = useState('');
  const [gpuUsage, setGpuUsage] = useState(0);
  const [benchmark, setBenchmark] = useState('');
  const [pattern, setPattern] = useState('');
  const [wordlistUrl, setWordlistUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const workerRef = useRef(null);

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
    let frame;
    if (typeof window !== 'undefined') {
      if (window.Worker) {
        workerRef.current = new Worker(new URL('./progress.worker.js', import.meta.url));
        workerRef.current.postMessage({ target: progressInfo.progress });
        workerRef.current.onmessage = ({ data }) => {
          const update = () => setProgress(data);
          if (prefersReducedMotion) {
            update();
          } else {
            frame = requestAnimationFrame(update);
          }
        };
      } else {
        const target = progressInfo.progress;
        if (prefersReducedMotion) {
          setProgress(target);
        } else {
          const animate = () => {
            setProgress((p) => {
              if (p >= target) return p;
              frame = requestAnimationFrame(animate);
              return p + 1;
            });
          };
          frame = requestAnimationFrame(animate);
        }
      }
    }
    return () => {
      if (workerRef.current) workerRef.current.terminate();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [prefersReducedMotion]);

  const selectedHash = hashTypes.find((h) => h.id === hashType)?.name;

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
      <SecurityDisclaimer />
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
        <label className="mr-2" htmlFor="hash-type">
          Hash Type:
        </label>
        <select
          id="hash-type"
          className="text-black px-2 py-1"
          value={hashType}
          onChange={(e) => setHashType(e.target.value)}
        >
          {hashTypes.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>
      <div>Detected: {selectedHash}</div>
      <button onClick={runBenchmark}>Run Benchmark</button>
      {benchmark && (
        <div data-testid="benchmark-output">{benchmark}</div>
      )}
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
      </div>
      <Gauge value={gpuUsage} />
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
        <div
          role="status"
          aria-live="polite"
          className="text-sm mt-2"
        >
          <div>Hash rate: {progressInfo.hashRate}</div>
          <div>ETA: {progressInfo.eta}</div>
          <div>Mode: {progressInfo.mode}</div>
        </div>
      </div>
    </div>
  );
}

export default HashcatApp;

export const displayHashcat = () => <HashcatApp />;

