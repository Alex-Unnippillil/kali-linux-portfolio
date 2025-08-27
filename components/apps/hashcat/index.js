import React, { useState, useEffect } from 'react';
import progressInfo from './progress.json';

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
  const [attemptRate, setAttemptRate] = useState(progressInfo.steps[0].attemptsPerSec);
  const [eta, setEta] = useState(progressInfo.steps[0].eta);
  const [cracked, setCracked] = useState([]);

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
    const steps = progressInfo.steps;
    let i = 0;
    const id = setInterval(() => {
      const step = steps[i];
      setProgress(step.percent);
      setAttemptRate(step.attemptsPerSec);
      setEta(step.eta);
      if (step.cracked) setCracked(step.cracked);
      i++;
      if (i >= steps.length) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
          <div>Attempts/sec: {attemptRate}</div>
          <div>ETA: {eta}</div>
          <div>Mode: {progressInfo.mode}</div>
        </div>
      </div>
      {cracked.length > 0 && (
        <pre className="mt-4 text-xs bg-black p-2 rounded">
          {cracked.map((c) => `${c.hash}: ${c.password}`).join('\n')}
        </pre>
      )}
      <p className="text-xs text-yellow-300 mt-2">{progressInfo.disclaimer}</p>
    </div>
  );
}

export default HashcatApp;

export const displayHashcat = () => <HashcatApp />;

