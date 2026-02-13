"use client";

import { useState, useEffect, useCallback } from 'react';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);

  const initializeWorker = useCallback(() => {
    const newWorker = new Worker(new URL('../workers/fixturesParser.ts', import.meta.url));
    newWorker.onmessage = (e) => {
      const { type, payload } = e.data as { type: string; payload: any };
      if (type === 'progress') {
        setProgress(typeof payload === 'number' ? payload : 0);
        setProgressLog((prev) => {
          const nextEntry = `Parsing ${typeof payload === 'number' ? payload : 0}%`;
          if (prev[prev.length - 1] === nextEntry) return prev;
          return [...prev, nextEntry];
        });
      }
      if (type === 'result') {
        setIsLoading(false);
        setProgress(100);
        setProgressLog((prev) => [...prev, 'Parsing complete']);
        onData(payload);
        try {
          localStorage.setItem('fixtures-last', JSON.stringify(payload));
        } catch {
          /* ignore */
        }
      }
    };
    return newWorker;
  }, [onData]);

  useEffect(() => {
    const w = initializeWorker();
    setWorker(w);
    return () => w.terminate();
  }, [initializeWorker]);

  const ensureWorker = useCallback(() => {
    if (worker) return worker;
    const newWorker = initializeWorker();
    setWorker(newWorker);
    return newWorker;
  }, [worker, initializeWorker]);

  const beginLoading = useCallback((initialMessage: string) => {
    setIsLoading(true);
    setProgress(0);
    setProgressLog([initialMessage]);
  }, []);

  const loadSample = async () => {
    beginLoading('Loading sample fixtures…');
    try {
      const res = await fetch('/fixtures/sample.json');
      if (!res.ok) throw new Error('Sample fetch failed');
      const text = await res.text();
      const activeWorker = ensureWorker();
      activeWorker.postMessage({ type: 'parse', text });
    } catch {
      setProgressLog((prev) => [...prev, 'Unable to load sample fixtures.']);
      setIsLoading(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    beginLoading(`Reading ${file.name}…`);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setProgressLog((prev) => [...prev, 'File contents could not be read as text.']);
        setIsLoading(false);
        return;
      }
      const activeWorker = ensureWorker();
      activeWorker.postMessage({ type: 'parse', text: result });
    };
    reader.onerror = () => {
      setProgressLog((prev) => [...prev, 'Failed to read the selected file.']);
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const cancel = () => {
    if (!worker) return;
    worker.postMessage({ type: 'cancel' });
    worker.terminate();
    const newWorker = initializeWorker();
    setWorker(newWorker);
    setIsLoading(false);
    setProgress(0);
    setProgressLog((prev) => [...prev, 'Parsing cancelled']);
  };

  return (
    <div className="text-xs" aria-label="fixtures loader" aria-busy={isLoading}>
      <div className="mb-2 flex items-center">
        <button onClick={loadSample} className="px-2 py-1 bg-ub-cool-grey text-white mr-2" type="button">
          Load Sample
        </button>
        <label className="px-2 py-1 bg-ub-cool-grey text-white mr-2 cursor-pointer">
          Import
          <input type="file" onChange={onFile} className="hidden" aria-label="import fixture" />
        </label>
      </div>
      <div className="mb-2" aria-label="progress">
        Parsing: {progress}%
      </div>
      {isLoading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-label="Fixture parsing in progress"
        >
          <div className="bg-ub-dark-grey text-white rounded-md shadow-lg p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Parsing fixtures</h2>
              <span className="text-xs" aria-live="polite" aria-atomic="true">
                {progress}% complete
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto text-xs space-y-1" role="log" aria-live="polite" aria-relevant="additions">
              {progressLog.map((entry, index) => (
                <div key={`${entry}-${index}`}>{entry}</div>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={cancel} className="px-3 py-1 bg-ub-red text-white rounded" type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

