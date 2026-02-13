"use client";

import { useState, useEffect, useRef } from 'react';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastLoggedError = useRef<string | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('../workers/fixturesParser.ts', import.meta.url));
    w.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'progress') setProgress(payload);
      if (type === 'result') {
        onData(payload);
        try {
          localStorage.setItem('fixtures-last', JSON.stringify(payload));
        } catch {
          /* ignore */
        }
      }
    };
    setWorker(w);
    return () => w.terminate();
  }, [onData]);

  const logError = (message: string, detail?: unknown) => {
    if (process.env.NODE_ENV !== 'production' && lastLoggedError.current !== message) {
      console.error('[FixturesLoader] ', message, detail);
      lastLoggedError.current = message;
    }
  };

  const loadSample = async () => {
    setError(null);
    try {
      const res = await fetch('/fixtures/sample.json');
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const text = await res.text();
      worker?.postMessage({ type: 'parse', text });
      lastLoggedError.current = null;
    } catch (err) {
      const message = 'Unable to load sample fixtures. Please retry.';
      setError(message);
      logError(message, err);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    lastLoggedError.current = null;
    const reader = new FileReader();
    reader.onload = () => {
      worker?.postMessage({ type: 'parse', text: reader.result });
    };
    reader.readAsText(file);
  };

  const cancel = () => worker?.postMessage({ type: 'cancel' });

  return (
    <div className="text-xs" aria-label="fixtures loader">
      <div className="mb-2 flex items-center">
        <button onClick={loadSample} className="px-2 py-1 bg-ub-cool-grey text-white mr-2" type="button">
          Load Sample
        </button>
        <label className="px-2 py-1 bg-ub-cool-grey text-white mr-2 cursor-pointer">
          Import
          <input type="file" onChange={onFile} className="hidden" aria-label="import fixture" />
        </label>
        <button onClick={cancel} className="px-2 py-1 bg-ub-red text-white" type="button">
          Cancel
        </button>
      </div>
      {error ? (
        <div className="mb-2 flex items-center gap-2 text-ub-orange" role="alert">
          <span>{error}</span>
          <button onClick={loadSample} className="px-2 py-1 bg-ub-cool-grey text-white" type="button">
            Retry
          </button>
        </div>
      ) : null}
      <div className="mb-2" aria-label="progress">
        Parsing: {progress}%
      </div>
    </div>
  );
}

