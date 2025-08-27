import React, { useState, useEffect } from 'react';
import {
  parseRules,
  identifyHashType,
} from './utils';
import progressData from './progress.json';

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
  const [attemptRate, setAttemptRate] = useState(progressData.steps[0].attemptsPerSec);
  const [eta, setEta] = useState(progressData.steps[0].eta);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const hashArr = hashes.split(/\r?\n/).filter(Boolean);
    if (!hashArr.length) {
      setError('At least one hash is required');
      return;
    }
    setError('');
    setLoading(true);
    setOutput('');
    setProgress(0);
    setPhase('wordlist');
    let i = 0;
    const steps = progressData.steps;
    const id = setInterval(() => {
      const step = steps[i];
      setProgress(step.percent);
      setAttemptRate(step.attemptsPerSec);
      setEta(step.eta);
      setPhase(step.phase);
      if (step.cracked) {
        setOutput(
          step.cracked
            .map((c) => `${c.hash}: ${c.password}`)
            .join('\n') + `\n\n${progressData.disclaimer}`
        );
      }
      i++;
      if (i >= steps.length) {
        clearInterval(id);
        setLoading(false);
      }
    }, 1000);
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
            <div className="w-full bg-gray-700 rounded h-4 overflow-hidden mt-2">
              <div
                className="h-full"
                style={{
                  width: `${progress}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg,#10b981,#10b981 10px,#3b82f6 10px,#3b82f6 20px)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: `${animOffset}px 0`,
                  transition: prefersReducedMotion ? 'none' : 'width 0.2s ease-out',
                }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span className="sr-only">{`Progress ${Math.round(progress)} percent`}</span>
              </div>
            </div>
            <p className="text-xs mt-1 text-white" aria-live="polite">
              {phase === 'wordlist'
                ? 'Processing wordlist'
                : phase === 'rules'
                ? 'Applying rules'
                : 'Done'}
              {` - ${attemptRate} - ETA ${eta}`}
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

