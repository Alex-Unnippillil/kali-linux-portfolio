"use client";

import { useEffect, useRef, useState } from 'react';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<FileReader | null>(null);

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
        setIsProcessing(false);
      }
    };
    setWorker(w);
    return () => {
      abortControllerRef.current?.abort();
      if (readerRef.current && readerRef.current.readyState === FileReader.LOADING) {
        readerRef.current.abort();
      }
      w.terminate();
    };
  }, [onData]);

  const resetState = () => {
    abortControllerRef.current = null;
    readerRef.current = null;
    setIsProcessing(false);
    setProgress(0);
  };

  const loadSample = async () => {
    if (!worker) {
      console.warn('Fixtures parser worker not ready.');
      return;
    }
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsProcessing(true);
    setProgress(0);
    try {
      const res = await fetch('/fixtures/sample.json', { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Failed to fetch sample fixtures: ${res.status}`);
      }
      const text = await res.text();
      if (!controller.signal.aborted) {
        worker.postMessage({ type: 'parse', text });
      }
      abortControllerRef.current = null;
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        console.error(error);
        resetState();
      }
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!worker) {
      console.warn('Fixtures parser worker not ready.');
      return;
    }
    const reader = new FileReader();
    readerRef.current?.abort();
    readerRef.current = reader;
    setIsProcessing(true);
    setProgress(0);
    reader.onload = () => {
      if (reader.error || reader.result == null) {
        resetState();
        return;
      }
      worker?.postMessage({ type: 'parse', text: reader.result });
      readerRef.current = null;
    };
    reader.onabort = resetState;
    reader.onerror = resetState;
    reader.readAsText(file);
  };

  const cancel = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (readerRef.current && readerRef.current.readyState === readerRef.current.LOADING) {
      readerRef.current.abort();
    }
    worker?.postMessage({ type: 'cancel' });
    setIsProcessing(false);
    setProgress(0);
  };

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
      <div className="mb-2" aria-label="progress">
        Parsing: {progress}%
      </div>
      {isProcessing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          role="alertdialog"
          aria-modal="true"
          aria-label="Parsing fixtures"
        >
          <div className="w-64 rounded bg-ub-dark text-white p-4 shadow-xl">
            <p className="mb-3 text-sm" aria-live="polite">
              Parsing fixtures… {progress}%
            </p>
            <div className="mb-3 h-2 w-full overflow-hidden rounded bg-white/20">
              <div
                className="h-full bg-ub-orange transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <button onClick={cancel} className="w-full px-3 py-2 bg-ub-red text-white" type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

