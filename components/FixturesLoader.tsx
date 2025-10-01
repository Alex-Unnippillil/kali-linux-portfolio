"use client";

import { useState, useEffect } from 'react';
import {
  encodeCacheValue,
  decodeCacheValue,
  isCacheRecord,
  type CacheRecord,
} from '../utils/cacheCompression';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('../workers/fixturesParser.ts', import.meta.url));
    w.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'progress') setProgress(payload);
      if (type === 'result') {
        const persist = async () => {
          if (isCacheRecord(payload)) {
            const rows = await decodeCacheValue<any[]>(payload);
            if (rows) onData(rows);
            try {
              localStorage.setItem('fixtures-last', JSON.stringify(payload));
            } catch {
              /* ignore */
            }
          } else if (Array.isArray(payload)) {
            onData(payload);
            try {
              const record = await encodeCacheValue(payload);
              localStorage.setItem('fixtures-last', JSON.stringify(record));
            } catch {
              /* ignore */
            }
          }
        };
        void persist();
      }
    };
    setWorker(w);
    return () => w.terminate();
  }, [onData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        const stored = window.localStorage.getItem('fixtures-last');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (isCacheRecord(parsed)) {
          const rows = await decodeCacheValue<any[]>(parsed as CacheRecord);
          if (!cancelled && rows) onData(rows);
        } else if (Array.isArray(parsed)) {
          onData(parsed);
        }
      } catch {
        /* ignore */
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [onData]);

  const loadSample = async () => {
    const res = await fetch('/fixtures/sample.json');
    const text = await res.text();
    worker?.postMessage({ type: 'parse', text });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      <div className="mb-2" aria-label="progress">
        Parsing: {progress}%
      </div>
    </div>
  );
}

