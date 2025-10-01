"use client";

import { useState, useEffect, useRef } from 'react';
import BackpressureNotice from './system/BackpressureNotice';
import {
  cancelJob,
  enqueueJob,
} from '../utils/backpressure';
import useBackpressureJob from '../hooks/useBackpressureJob';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useBackpressureJob(jobId);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
    },
    [],
  );

  const startParsing = (text: string, source: string) => {
    if (!text) return;
    setProgress(0);

    const id = `fixtures:${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const handle = enqueueJob(
      'fixtures:parse',
      {
        run: () =>
          new Promise<void>((resolve, reject) => {
            const worker = new Worker(
              new URL('../workers/fixturesParser.ts', import.meta.url),
            );
            workerRef.current = worker;
            const cleanup = () => {
              workerRef.current?.terminate();
              workerRef.current = null;
            };
            worker.onerror = (err) => {
              cleanup();
              reject(err?.message || 'Failed to parse fixtures');
            };
            worker.onmessage = (e) => {
              if (jobIdRef.current !== id) return;
              const { type, payload } = e.data;
              if (type === 'progress') setProgress(payload);
              if (type === 'result') {
                onData(payload);
                try {
                  localStorage.setItem('fixtures-last', JSON.stringify(payload));
                } catch {
                  /* ignore */
                }
                cleanup();
                resolve();
              }
            };
            worker.postMessage({ type: 'parse', text });
          }),
        cancel: () => {
          if (workerRef.current) {
            workerRef.current.postMessage({ type: 'cancel' });
            workerRef.current.terminate();
            workerRef.current = null;
          }
          setProgress(0);
        },
      },
      {
        id,
        label: source === 'sample' ? 'Parsing sample fixtures' : 'Parsing imported fixtures',
        metadata: { source },
      },
    );

    jobIdRef.current = id;
    setJobId(id);
    handle.done.finally(() => {
      if (jobIdRef.current === id) {
        jobIdRef.current = null;
        setJobId(null);
      }
    });
  };

  const loadSample = async () => {
    const res = await fetch('/fixtures/sample.json');
    const text = await res.text();
    startParsing(text, 'sample');
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      startParsing(String(reader.result || ''), 'upload');
    };
    reader.readAsText(file);
  };

  const cancel = () => {
    if (!jobIdRef.current) return;
    cancelJob(jobIdRef.current);
    setProgress(0);
  };

  const cancelLabel = job?.status === 'paused' ? 'Remove' : 'Cancel';

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
        <button
          onClick={cancel}
          className="px-2 py-1 bg-ub-red text-white disabled:opacity-60"
          type="button"
          disabled={!jobId}
        >
          {cancelLabel}
        </button>
      </div>
      {job && (
        <div className="mb-2">
          <BackpressureNotice
            jobId={jobId}
            description="Fixture parsing is waiting for a worker slot"
          />
        </div>
      )}
      <div className="mb-2" aria-label="progress">
        Parsing: {progress}%
      </div>
    </div>
  );
}

