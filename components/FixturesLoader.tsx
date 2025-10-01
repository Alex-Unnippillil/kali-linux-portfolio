"use client";

import { useEffect, useRef, useState } from 'react';
import { abortableFetch } from '../utils/abortableFetch';
import { createCancelScope, type CancelScope } from '../utils/cancel';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [worker, setWorker] = useState<Worker | null>(null);
  const cancelRootRef = useRef<CancelScope | null>(null);
  const activeScopeRef = useRef<CancelScope | null>(null);
  const abortCleanupRef = useRef<(() => void) | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    cancelRootRef.current = createCancelScope('fixtures-loader', {
      meta: { component: 'FixturesLoader' },
    });
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
    return () => {
      unmountedRef.current = true;
      abortCleanupRef.current?.();
      abortCleanupRef.current = null;
      activeScopeRef.current?.abort({ message: 'fixtures loader cleanup' });
      activeScopeRef.current?.dispose();
      activeScopeRef.current = null;
      cancelRootRef.current?.abort({ message: 'fixtures loader unmounted' });
      cancelRootRef.current?.dispose();
      cancelRootRef.current = null;
      w.terminate();
    };
  }, [onData]);

  const loadSample = async () => {
    if (!cancelRootRef.current) {
      cancelRootRef.current = createCancelScope('fixtures-loader', {
        meta: { component: 'FixturesLoader' },
      });
    }
    abortCleanupRef.current?.();
    abortCleanupRef.current = null;
    activeScopeRef.current?.abort({ message: 'restart fixtures fetch' });
    activeScopeRef.current?.dispose();
    const scope = cancelRootRef.current.child('sample-fetch', { action: 'loadSample' });
    activeScopeRef.current = scope;
    abortCleanupRef.current = scope.onAbort(() => {
      if (!unmountedRef.current) setProgress(0);
    });
    setProgress(0);
    try {
      const { promise } = abortableFetch('/fixtures/sample.json', {
        cancel: scope,
        scope: 'fixtures-loader-fetch',
      });
      const res = await promise;
      const text = await res.text();
      if (!scope.signal.aborted) {
        worker?.postMessage({ type: 'parse', text });
      }
    } catch {
      if (!scope.signal.aborted && !unmountedRef.current) setProgress(0);
    } finally {
      abortCleanupRef.current?.();
      abortCleanupRef.current = null;
      scope.dispose();
      if (activeScopeRef.current === scope) activeScopeRef.current = null;
    }
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

  const cancelAndAbort = () => {
    activeScopeRef.current?.abort({ message: 'user cancelled fixtures parse' });
    activeScopeRef.current?.dispose();
    activeScopeRef.current = null;
    abortCleanupRef.current?.();
    abortCleanupRef.current = null;
    setProgress(0);
    cancel();
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
        <button onClick={cancelAndAbort} className="px-2 py-1 bg-ub-red text-white" type="button">
          Cancel
        </button>
      </div>
      <div className="mb-2" aria-label="progress">
        Parsing: {progress}%
      </div>
    </div>
  );
}

