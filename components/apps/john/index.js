import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  parseRules,
  distributeTasks,
  identifyHashType,
  generateIncrementalCandidates,
  parsePotfile,
} from './utils';
import FormError from '../../ui/FormError';
import StatsChart from '../../StatsChart';
import johnPlaceholders from './placeholders';

// Enhanced John the Ripper interface that supports rule uploads,
// basic hash analysis and mock distribution of cracking tasks.

const JohnApp = () => {
  const [hashes, setHashes] = useState('');
  const [hashTypes, setHashTypes] = useState([]);
  const [rules, setRules] = useState([]);
  const [ruleText, setRuleText] = useState('');
  const [wordlistText, setWordlistText] = useState('');
  const [wordlistFile, setWordlistFile] = useState(null);
  const [stats, setStats] = useState(null);
  const [endpoints, setEndpoints] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('wordlist');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [animOffset, setAnimOffset] = useState(0);
  const [mode, setMode] = useState('wordlist');
  const [candidates, setCandidates] = useState([]);
  const [potfileEntries, setPotfileEntries] = useState([]);
  const [potFilter, setPotFilter] = useState('');
  const workerRef = useRef(null);
  const statsWorkerRef = useRef(null);
  const controllerRef = useRef(null);

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

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      statsWorkerRef.current?.terminate();
    },
    []
  );

  const startProgress = (total) => {
    if (workerRef.current) workerRef.current.terminate();
    if (typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./progress.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const { percent, phase: p } = e.data;
        setProgress(percent);
        setPhase(p);
      };
      workerRef.current.postMessage({ type: 'init', total });
    }
  };

  const incrementProgress = (p) => {
    workerRef.current?.postMessage({ type: 'increment', phase: p });
  };

  const stopProgress = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  const initStatsWorker = () => {
    if (statsWorkerRef.current || typeof Worker !== 'function') return;
    statsWorkerRef.current = new Worker(
      new URL('./stats.worker.js', import.meta.url)
    );
    statsWorkerRef.current.onmessage = (e) => {
      const { count, time, preview, error: err } = e.data;
      if (err) {
        setError(err);
        return;
      }
      setStats({ count, time });
      setCandidates(preview);
    };
  };

  const analyzeWordlist = useCallback(
    (file, text) => {
      initStatsWorker();
      statsWorkerRef.current?.postMessage({ file, text, rules });
    },
    [rules]
  );

  const handleRuleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setRuleText(text);
      setRules(parseRules(text));
    };
    reader.readAsText(file);
  };

  const handleRuleTextChange = (e) => {
    const text = e.target.value;
    setRuleText(text);
    setRules(parseRules(text));
  };

  const handleWordlistUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWordlistFile(file);
    setWordlistText('');
  };

  const handleWordlistTextChange = (e) => {
    setWordlistFile(null);
    setWordlistText(e.target.value);
  };

  const sampleWordlists = johnPlaceholders.sampleWordlists;

  const handleSampleWordlist = async (e) => {
    const path = e.target.value;
    if (!path) return;
    const res = await fetch(path);
    const text = await res.text();
    setWordlistFile(null);
    setWordlistText(text);
  };

  useEffect(() => {
    if (mode !== 'wordlist') return;
    if (!wordlistFile && !wordlistText) {
      setStats(null);
      setCandidates([]);
      return;
    }
    analyzeWordlist(wordlistFile, wordlistText);
  }, [wordlistFile, wordlistText, mode, analyzeWordlist]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(2)}m`;
    const hours = minutes / 60;
    if (hours < 24) return `${hours.toFixed(2)}h`;
    const days = hours / 24;
    return `${days.toFixed(2)}d`;
  };

  const handleModeChange = (e) => {
    const m = e.target.value;
    setMode(m);
    if (m === 'incremental') {
      setCandidates(generateIncrementalCandidates());
    } else {
      setCandidates([]);
    }
  };

  const handlePotfileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setPotfileEntries(parsePotfile(text));
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const filtered = potfileEntries.filter(
      (p) =>
        p.hash.includes(potFilter) ||
        p.password.toLowerCase().includes(potFilter.toLowerCase())
    );
    const blob = new Blob(
      [filtered.map((p) => `${p.hash}:${p.password}`).join('\n')],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'potfile.txt';
    a.click();
    URL.revokeObjectURL(url);
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
    controllerRef.current = new AbortController();
    const { signal } = controllerRef.current;
    try {
      const assignments = endpointArr.length
        ? distributeTasks(hashArr, endpointArr)
        : { local: hashArr };
      const results = [];
      for (const [endpoint, hs] of Object.entries(assignments)) {
        for (const h of hs) {
          if (signal.aborted) throw new Error('cancelled');
          incrementProgress('wordlist');
          if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
            const res = await fetch('/api/john', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hash: h, rules }),
              signal,
            });
            const data = await res.json();
            incrementProgress('rules');
            results.push(
              `${endpoint} (${identifyHashType(h)}): ${
                data.output || data.error || 'No output'
              }`
            );
          } else {
            incrementProgress('rules');
            results.push(
              `${endpoint} (${identifyHashType(h)}): demo result`
            );
          }
        }
      }
      setOutput(results.join('\n'));
      setProgress(100);
      setPhase('done');
    } catch (err) {
      if (err.name !== 'AbortError' && err.message !== 'cancelled') {
        setError(err.message);
      }
    } finally {
      controllerRef.current = null;
      stopProgress();
      setLoading(false);
    }
  };

  const handleCancel = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    stopProgress();
    setLoading(false);
  };

  const filteredPotfile = potfileEntries.filter(
    (p) =>
      p.hash.includes(potFilter) ||
      p.password.toLowerCase().includes(potFilter.toLowerCase())
  );

  return (
    <div className="h-full w-full flex flex-col bg-kali-surface text-kali-text">
      <p className="text-xs text-yellow-300 p-2">
        {johnPlaceholders.banners.desktop}
      </p>
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2">
        <label htmlFor="john-hashes" id="john-hashes-label" className="text-sm">
          Hashes (one per line)
        </label>
        <textarea
          id="john-hashes"
          value={hashes}
          onChange={handleHashesChange}
          placeholder="Enter hashes"
          className="flex-1 px-2 py-1 bg-kali-dark text-kali-text rounded border border-kali-border h-24 focus:outline-none focus:ring-2 focus:ring-kali-focus focus:border-transparent"
          aria-labelledby="john-hashes-label"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'john-error' : undefined}
        />
        {hashTypes.length > 0 && (
          <ul className="text-xs text-kali-text/70">
            {hashTypes.map((t, i) => (
              <li key={i}>{`Hash ${i + 1}: ${t}`}</li>
            ))}
          </ul>
        )}
        <label htmlFor="john-rule-text" id="john-rule-text-label" className="text-sm">
          Rules
        </label>
        <textarea
          id="john-rule-text"
          value={ruleText}
          onChange={handleRuleTextChange}
          placeholder="Enter rules"
          className="flex-1 px-2 py-1 bg-kali-dark text-kali-text rounded border border-kali-border h-24 focus:outline-none focus:ring-2 focus:ring-kali-focus focus:border-transparent"
          aria-labelledby="john-rule-text-label"
        />
        <label htmlFor="john-rule" id="john-rule-label" className="text-sm">
          Rule file
        </label>
        <input
          id="john-rule"
          type="file"
          accept=".rule,.rules,.txt"
          onChange={handleRuleUpload}
          aria-labelledby="john-rule-label"
          className="text-sm"
        />
        <label htmlFor="john-mode" id="john-mode-label" className="text-sm">
          Mode
        </label>
        <select
          id="john-mode"
          value={mode}
          onChange={handleModeChange}
          className="px-2 py-1 bg-kali-dark text-kali-text rounded border border-kali-border focus:outline-none focus:ring-2 focus:ring-kali-focus focus:border-transparent"
          aria-labelledby="john-mode-label"
        >
          <option value="wordlist">Wordlist</option>
          <option value="incremental">Incremental</option>
        </select>
        {mode === 'wordlist' && (
          <>
            <label htmlFor="john-wordlist-text" id="john-wordlist-text-label" className="text-sm">
              Wordlist
            </label>
            <textarea
              id="john-wordlist-text"
              value={wordlistText}
              onChange={handleWordlistTextChange}
              placeholder="Enter wordlist (one per line)"
              className="flex-1 px-2 py-1 bg-kali-dark text-kali-text rounded border border-kali-border h-24 focus:outline-none focus:ring-2 focus:ring-kali-focus focus:border-transparent"
              aria-labelledby="john-wordlist-text-label"
            />
            <label htmlFor="john-wordlist" id="john-wordlist-label" className="text-sm">
              Wordlist file
            </label>
            <input
              id="john-wordlist"
              type="file"
              accept=".txt"
              onChange={handleWordlistUpload}
              aria-labelledby="john-wordlist-label"
              className="text-sm"
            />
            <label htmlFor="john-sample-wordlist" id="john-sample-wordlist-label" className="text-sm">
              Sample wordlist
            </label>
            <select
              id="john-sample-wordlist"
              onChange={handleSampleWordlist}
              className="px-2 py-1 bg-kali-dark text-kali-text rounded text-sm border border-kali-border focus:outline-none focus:ring-2 focus:ring-kali-focus focus:border-transparent"
              aria-labelledby="john-sample-wordlist-label"
            >
              <option value="">Select sample</option>
              {sampleWordlists.map((s) => (
                <option key={s.path} value={s.path}>
                  {s.label}
                </option>
              ))}
            </select>
          </>
        )}
        {stats && (
          <div className="text-xs bg-[color:color-mix(in_srgb,_var(--color-dark)_92%,_transparent)] border border-kali-border p-2 rounded">
            {candidates.length > 0 && (
              <>
                <p className="mb-1">Candidate preview:</p>
                <ul className="max-h-24 overflow-auto">
                  {candidates.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-2">{`Total: ${stats.count.toLocaleString()}`}</p>
            <p>{`Estimated @1M/s: ${formatTime(stats.time)}`}</p>
            <StatsChart count={stats.count} time={stats.time} />
          </div>
        )}
        <label htmlFor="john-endpoints" id="john-endpoints-label" className="text-sm">
          Endpoints (comma separated)
        </label>
        <input
          id="john-endpoints"
          type="text"
          value={endpoints}
          onChange={(e) => setEndpoints(e.target.value)}
          placeholder="endpoint1, endpoint2"
          className="px-2 py-1 bg-kali-dark text-kali-text rounded border border-kali-border focus:outline-none focus:ring-2 focus:ring-kali-focus focus:border-transparent"
          aria-labelledby="john-endpoints-label"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-4 py-1 bg-kali-primary text-kali-inverse rounded self-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus hover:bg-[color:var(--kali-blue-dark)]"
            disabled={loading}
          >
            {loading ? 'Running...' : 'Crack'}
          </button>
          {loading && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-1 rounded bg-[color:var(--game-color-danger)] text-white transition-colors hover:bg-[color:color-mix(in_srgb,var(--game-color-danger)85%,#000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--game-color-danger)]"
            >
              Cancel
            </button>
          )}
        </div>
        {loading && (
          <>
            <div className="w-full bg-kali-muted rounded h-4 overflow-hidden mt-2 relative border border-kali-border/60">
              <div
                className="h-full"
                style={{
                  width: `${progress}%`,
                  backgroundImage:
                    phase === 'wordlist'
                      ? 'repeating-linear-gradient(45deg, var(--color-primary), var(--color-primary) 12px, color-mix(in srgb, var(--color-primary) 75%, transparent) 12px, color-mix(in srgb, var(--color-primary) 75%, transparent) 24px)'
                      : 'repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-primary) 85%, transparent), color-mix(in srgb, var(--color-primary) 85%, transparent) 12px, color-mix(in srgb, var(--game-color-danger) 80%, transparent) 12px, color-mix(in srgb, var(--game-color-danger) 80%, transparent) 24px)',
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
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-kali-text">
                {`${Math.round(progress)}%`}
              </span>
            </div>
            <p className="text-xs mt-1 text-kali-text" aria-live="polite">
              {`Keyspace ${Math.round(progress)}% - ${phase}`}
            </p>
          </>
        )}
        {error && <FormError id="john-error">{error}</FormError>}
      </form>
      <pre className="flex-1 overflow-auto p-4 whitespace-pre-wrap bg-kali-dark text-kali-text border-t border-kali-border">
        {output}
      </pre>
      <div className="p-4 flex flex-col gap-2 border-t border-kali-border/60 bg-kali-surface">
        <label htmlFor="john-potfile" id="john-potfile-label" className="text-sm">
          Potfile
        </label>
        <input
          id="john-potfile"
          type="file"
          accept=".pot,.txt"
          onChange={handlePotfileUpload}
          aria-labelledby="john-potfile-label"
          className="text-sm"
        />
        {potfileEntries.length > 0 && (
          <>
            <label htmlFor="john-potfile-filter" className="sr-only" id="john-potfile-filter-label">
              Filter potfile entries
            </label>
            <input
              type="text"
              id="john-potfile-filter"
              value={potFilter}
              onChange={(e) => setPotFilter(e.target.value)}
              placeholder="Filter"
              className="px-2 py-1 bg-kali-dark text-kali-text rounded text-sm border border-kali-border focus:outline-none focus:ring-2 focus:ring-kali-focus focus:border-transparent"
              aria-labelledby="john-potfile-filter-label"
            />
            <div className="max-h-40 overflow-auto bg-[color:color-mix(in_srgb,_var(--color-dark)_92%,_transparent)] p-2 rounded text-xs border border-kali-border">
              {filteredPotfile.map((p, i) => (
                <div key={i}>{`${p.hash}:${p.password}`}</div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="self-start px-3 py-1 bg-kali-muted hover:bg-kali-dark text-kali-text rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
            >
              Export
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JohnApp;

export const displayJohn = (addFolder, openApp) => (
  <JohnApp addFolder={addFolder} openApp={openApp} />
);

