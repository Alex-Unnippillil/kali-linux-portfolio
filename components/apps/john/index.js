import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import SimulationBanner from '../SimulationBanner';
import SimulationReportExport from '../SimulationReportExport';
import { recordSimulation } from '../../../utils/simulationLog';
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

const guidedScenarios = [
  {
    id: 'raw-md5-success',
    label: 'Raw-MD5 quick win',
    hashes: [johnPlaceholders.hashedPasswords[0].hash],
    wordlist: ['admin', 'letmein', 'password', 'welcome'],
    ruleText: '',
    mode: 'wordlist',
    labResultId: 'raw-md5-success',
  },
  {
    id: 'wordlist-exhausted',
    label: 'Wordlist exhausted',
    hashes: ['5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8'],
    wordlist: ['dragon', 'summer2024', 'passw0rd', 'welcome1'],
    ruleText: '',
    mode: 'wordlist',
    labResultId: 'wordlist-exhausted',
  },
];

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
  const [showHelp, setShowHelp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeScenarioId, setActiveScenarioId] = useState(guidedScenarios[0].id);
  const [toast, setToast] = useState('');
  const workerRef = useRef(null);
  const statsWorkerRef = useRef(null);
  const controllerRef = useRef(null);
  const startRef = useRef(0);
  const outputRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    if (typeof window !== 'undefined') {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(''), 2000);
    }
  }, []);

  const activeScenarioCard = useMemo(() => {
    const activeScenario = guidedScenarios.find((scenario) => scenario.id === activeScenarioId);
    if (activeScenario) {
      return johnPlaceholders.labResults.find((entry) => entry.id === activeScenario.labResultId) || null;
    }
    if (output.includes('Raw-MD5')) {
      return johnPlaceholders.labResults.find((entry) => entry.id === 'raw-md5-success') || null;
    }
    if (output.includes('Raw-SHA1')) {
      return johnPlaceholders.labResults.find((entry) => entry.id === 'wordlist-exhausted') || null;
    }
    return null;
  }, [activeScenarioId, output]);

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

  useEffect(
    () => () => {
      if (typeof window !== 'undefined') {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 250);
    return () => clearInterval(interval);
  }, [loading]);

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

  const handleLoadScenario = () => {
    const scenario = guidedScenarios.find((entry) => entry.id === activeScenarioId);
    if (!scenario) return;
    const nextRuleText = scenario.ruleText || '';
    const parsedRules = parseRules(nextRuleText);
    setHashes(scenario.hashes.join('\n'));
    setHashTypes(scenario.hashes.map((h) => identifyHashType(h)));
    setRuleText(nextRuleText);
    setRules(parsedRules);
    setMode('wordlist');
    setWordlistFile(null);
    setWordlistText(scenario.wordlist.join('\n'));
    setEndpoints('');
    const scenarioCard = johnPlaceholders.labResults.find((entry) => entry.id === scenario.labResultId);
    setOutput(scenarioCard?.output || '');
    setError('');
    setProgress(0);
    setPhase('wordlist');
    setLoading(false);
    setStats(null);
    setCandidates([]);
    recordSimulation({
      tool: 'john',
      title: 'Guided scenario loaded',
      summary: scenario.label,
      data: {
        scenarioId: scenario.id,
        hashes: scenario.hashes.length,
        rules: parsedRules.length,
        mode: scenario.mode,
      },
    });
    showToast(`Loaded ${scenario.label}`);
  };

  const copyOutput = async () => {
    if (!output.trim()) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      showToast('Clipboard unavailable');
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      showToast('Output copied');
    } catch (err) {
      showToast('Copy failed');
    }
  };

  const selectOutput = () => {
    const el = outputRef.current;
    if (!el || typeof window === 'undefined') return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    showToast('Output selected');
  };

  const downloadOutput = () => {
    if (!output.trim() || typeof document === 'undefined') return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'john-output.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Output downloaded');
  };

  const clearOutput = () => {
    setOutput('');
    showToast('Output cleared');
  };

  const handleOutputKey = (e) => {
    if (!e.ctrlKey) return;
    if (e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectOutput();
    }
    if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copyOutput();
    }
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
      recordSimulation({
        tool: 'john',
        title: 'Hash audit',
        summary: `${hashArr.length} hash${hashArr.length === 1 ? '' : 'es'} using ${
          endpointArr.length || 1
        } endpoint${endpointArr.length === 1 ? '' : 's'}`,
        data: {
          hashes: hashArr.length,
          endpoints: endpointArr.length || 1,
          mode,
          rules: rules.length,
        },
      });
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
    <div className="relative h-full w-full flex flex-col bg-kali-surface text-kali-text">
      <SimulationBanner
        toolName="John the Ripper"
        message={johnPlaceholders.banners.desktop}
      />
      <div className="px-4 pt-4">
        <div className="mb-4 rounded border border-kali-severity-medium/60 bg-kali-severity-medium/15 p-3">
          <p className="text-xs font-semibold text-kali-text">
            Educational use only. Do not attempt password cracking on accounts or systems without explicit permission.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((prev) => !prev)}
          className="rounded border border-kali-border/70 px-3 py-1 text-xs text-kali-text/80 hover:text-kali-text"
          aria-expanded={showHelp}
        >
          {showHelp ? 'Hide' : 'About this tool'}
        </button>
        {showHelp && (
          <div className="mt-2 rounded border border-kali-border/70 bg-kali-dark/60 p-3 text-xs text-kali-text/80">
            <p className="font-semibold text-kali-text">Learning notes</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>
                John the Ripper compares hash candidates from wordlists, rules, or
                incremental modes to demonstrate cracking workflows.
              </li>
              <li>
                The progress bar represents keyspace coverage in this demo, not
                real brute-force speed.
              </li>
              <li>
                Results are mock outputs suitable for safe classroom walkthroughs.
              </li>
            </ul>
          </div>
        )}
        <div className="mt-4 rounded border border-kali-border bg-kali-dark/60 p-3">
          <p className="text-sm font-semibold text-kali-text">Guided scenario</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="john-scenario" className="sr-only" id="john-scenario-label">
              Select guided scenario
            </label>
            <select
              id="john-scenario"
              value={activeScenarioId}
              onChange={(e) => setActiveScenarioId(e.target.value)}
              className="rounded border border-kali-border bg-kali-dark px-3 py-2 text-sm text-kali-text focus:outline-none focus:ring-2 focus:ring-kali-focus focus:border-transparent"
              aria-labelledby="john-scenario-label"
            >
              {guidedScenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLoadScenario}
              className="rounded bg-kali-control px-3 py-2 text-sm font-medium text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
            >
              Load scenario
            </button>
          </div>
        </div>
      </div>
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
            <p className="text-xs text-kali-text/80">
              {`Elapsed time: ${formatTime(elapsed)}`}
            </p>
          </>
        )}
        {error && <FormError id="john-error">{error}</FormError>}
      </form>
      <div className="border-t border-kali-border bg-kali-dark p-4">
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyOutput}
            className="rounded border border-kali-border/80 px-2 py-1 text-xs text-kali-text/80 hover:text-kali-text"
          >
            Copy output
          </button>
          <button
            type="button"
            onClick={selectOutput}
            className="rounded border border-kali-border/80 px-2 py-1 text-xs text-kali-text/80 hover:text-kali-text"
          >
            Select output
          </button>
          <button
            type="button"
            onClick={downloadOutput}
            className="rounded border border-kali-border/80 px-2 py-1 text-xs text-kali-text/80 hover:text-kali-text"
          >
            Download output
          </button>
          <button
            type="button"
            onClick={clearOutput}
            className="rounded border border-kali-border/80 px-2 py-1 text-xs text-kali-text/80 hover:text-kali-text"
          >
            Clear output
          </button>
        </div>
        <pre
          ref={outputRef}
          tabIndex={0}
          onKeyDown={handleOutputKey}
          className="max-h-60 overflow-auto whitespace-pre-wrap rounded border border-kali-border bg-kali-dark p-3 text-kali-text focus:outline-none focus:ring-2 focus:ring-kali-focus"
          aria-label="John output"
        >
          {output}
        </pre>
        {output && activeScenarioCard && (
          <div className="mt-3 rounded border border-kali-border bg-kali-dark p-3">
            <p className="text-sm font-semibold text-kali-text">{activeScenarioCard.title}</p>
            <p className="mt-1 text-xs text-kali-text/80">{activeScenarioCard.summary}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-kali-text/80">
              {activeScenarioCard.interpretation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
        <SimulationReportExport dense />
      </div>
      {toast && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded border border-kali-border bg-kali-dark/95 px-3 py-1 text-xs text-kali-text">
          {toast}
        </div>
      )}
    </div>
  );
};

export default JohnApp;

export const displayJohn = (addFolder, openApp) => (
  <JohnApp addFolder={addFolder} openApp={openApp} />
);
