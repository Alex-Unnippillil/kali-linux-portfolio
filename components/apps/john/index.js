import React, { useState, useRef, useEffect } from 'react';
import {
  parseRules,
  distributeTasks,
  identifyHashType,
} from './utils';

// Enhanced John the Ripper interface that supports rule uploads,
// basic hash analysis and mock distribution of cracking tasks.

const JohnApp = () => {
  const [hashes, setHashes] = useState('');
  const [hashTypes, setHashTypes] = useState([]);
  const [rules, setRules] = useState([]);
  const [endpoints, setEndpoints] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('wordlist');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [animOffset, setAnimOffset] = useState(0);
  const workerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    let frame;
    const animate = () => {
      setAnimOffset((o) => (o + 1) % 20);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [prefersReducedMotion]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const startProgress = (total) => {
    if (workerRef.current) workerRef.current.terminate();
    workerRef.current = new Worker(new URL('./progress.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { percent, phase: p } = e.data;
      setProgress(percent);
      setPhase(p);
    };
    workerRef.current.postMessage({ type: 'init', total });
  };

  const incrementProgress = (p) => {
    workerRef.current?.postMessage({ type: 'increment', phase: p });
  };

  const stopProgress = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  const handleRuleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result || '';
      setRules(parseRules(String(text)));
    };
    reader.readAsText(file);
  };

  const handleHashesChange = (e) => {
    const value = e.target.value;
    setHashes(value);
    const arr = value.split(/\r?\n/).filter(Boolean);
    setHashTypes(arr.map((h) => identifyHashType(h)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hashArr = hashes.split(/\r?\n/).filter(Boolean);
    if (!hashArr.length) {
      setError('At least one hash is required');
      return;
    }
    const endpointArr = endpoints
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setError('');
    setLoading(true);
    setOutput('');
    const totalSteps = hashArr.length * 2;
    startProgress(totalSteps);
    try {
      const assignments = endpointArr.length
        ? distributeTasks(hashArr, endpointArr)
        : { local: hashArr };
      const results = [];
      for (const [endpoint, hs] of Object.entries(assignments)) {
        for (const h of hs) {
          incrementProgress('wordlist');
          const res = await fetch('/api/john', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash: h, rules }),
          });
          const data = await res.json();
          incrementProgress('rules');
          results.push(
            `${endpoint} (${identifyHashType(h)}): ${
              data.output || data.error || 'No output'
            }`
          );
        }
      }
      setOutput(results.join('\n'));
      setProgress(100);
      setPhase('done');
    } catch (err) {
      setError(err.message);
    } finally {
      stopProgress();
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2">
        <label htmlFor="john-hashes" className="text-sm">
          Hashes (one per line)
        </label>
        <textarea
          id="john-hashes"
          value={hashes}
          onChange={handleHashesChange}
          placeholder="Enter hashes"
          className="flex-1 px-2 py-1 bg-gray-800 text-white rounded h-24"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'john-error' : undefined}
        />
        {hashTypes.length > 0 && (
          <ul className="text-xs text-gray-300">
            {hashTypes.map((t, i) => (
              <li key={i}>{`Hash ${i + 1}: ${t}`}</li>
            ))}
          </ul>
        )}
        <label htmlFor="john-rule" className="text-sm">
          Rule file
        </label>
        <input
          id="john-rule"
          type="file"
          accept=".rule,.rules,.txt"
          onChange={handleRuleUpload}
          className="text-sm"
        />
        <label htmlFor="john-endpoints" className="text-sm">
          Endpoints (comma separated)
        </label>
        <input
          id="john-endpoints"
          type="text"
          value={endpoints}
          onChange={(e) => setEndpoints(e.target.value)}
          placeholder="endpoint1, endpoint2"
          className="px-2 py-1 bg-gray-800 text-white rounded"
        />
        <button
          type="submit"
          className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded self-start"
          disabled={loading}
        >
          {loading ? 'Running...' : 'Crack'}
        </button>
        {loading && (
          <>
            <div className="w-full bg-gray-700 rounded h-4 overflow-hidden mt-2 relative">
              <div
                className="h-full"
                style={{
                  width: `${progress}%`,
                  backgroundImage:
                    phase === 'wordlist'
                      ? 'repeating-linear-gradient(45deg,#065f46,#065f46 10px,#1e3a8a 10px,#1e3a8a 20px)'
                      : 'repeating-linear-gradient(45deg,#1e3a8a,#1e3a8a 10px,#065f46 10px,#065f46 20px)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: `${phase === 'wordlist' ? animOffset : -animOffset}px 0`,
                  transition: prefersReducedMotion ? 'none' : 'width 0.2s ease-out',
                }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span className="sr-only">{`Progress ${Math.round(progress)} percent`}</span>
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {`${Math.round(progress)}%`}
              </span>
            </div>
            <p className="text-xs mt-1 text-white" aria-live="polite">
              {`Keyspace ${Math.round(progress)}% - ${phase}`}
            </p>
          </>
        )}
        {error && (
          <p id="john-error" role="alert" className="text-red-500 text-sm">
            {error}
          </p>
        )}
      </form>
      <pre className="flex-1 overflow-auto p-4 whitespace-pre-wrap">{output}</pre>
    </div>
  );
};

export default JohnApp;

export const displayJohn = (addFolder, openApp) => (
  <JohnApp addFolder={addFolder} openApp={openApp} />
);

