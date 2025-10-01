"use client";

import { type ChangeEvent, useCallback, useState } from 'react';
import { useWorkerPool } from '../hooks/useWorkerPool';
import { workerPool } from '../workers/pool/WorkerPool';
import type {
  FixturesParserProgress,
  FixturesParserRequest,
  FixturesParserResult,
} from '../workers/fixturesParser';

if (typeof globalThis !== 'undefined' && typeof globalThis.Worker !== 'undefined') {
  workerPool.registerWorker<FixturesParserRequest, FixturesParserResult, FixturesParserProgress>({
    name: 'fixtures-parser',
    create: () => new Worker(new URL('../workers/fixturesParser.ts', import.meta.url)),
    maxConcurrency: 2,
  });
}

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const { enqueueJob, cancelJob } = useWorkerPool<
    FixturesParserRequest,
    FixturesParserResult,
    FixturesParserProgress
  >('fixtures-parser');
  const [progress, setProgress] = useState(0);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const startParse = useCallback(
    async (text: string) => {
      if (!text) return;
      if (currentJobId) {
        cancelJob(currentJobId);
      }
      setProgress(0);
      const job = enqueueJob({
        payload: { text },
        onProgress: (p) => setProgress(p.percent),
      });
      setCurrentJobId(job.jobId);
      try {
        const result = await job.promise;
        onData(result.rows);
        setProgress(100);
        try {
          localStorage.setItem('fixtures-last', JSON.stringify(result.rows));
        } catch {
          // ignore storage failures
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error(err);
        }
      } finally {
        setCurrentJobId(null);
      }
    },
    [cancelJob, currentJobId, enqueueJob, onData],
  );

  const loadSample = useCallback(async () => {
    const res = await fetch('/fixtures/sample.json');
    const text = await res.text();
    startParse(text);
  }, [startParse]);

  const onFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        startParse(text);
      };
      reader.readAsText(file);
    },
    [startParse],
  );

  const cancel = useCallback(() => {
    if (currentJobId) {
      cancelJob(currentJobId);
      setCurrentJobId(null);
      setProgress(0);
    }
  }, [cancelJob, currentJobId]);

  return (
    <div className="text-xs" aria-label="fixtures loader">
      <div className="mb-2 flex items-center">
        <button
          onClick={loadSample}
          className="px-2 py-1 bg-ub-cool-grey text-white mr-2"
          type="button"
        >
          Load Sample
        </button>
        <label className="px-2 py-1 bg-ub-cool-grey text-white mr-2 cursor-pointer">
          Import
          <input
            type="file"
            onChange={onFile}
            className="hidden"
            aria-label="import fixture"
          />
        </label>
        <button
          onClick={cancel}
          className="px-2 py-1 bg-ub-red text-white"
          type="button"
          disabled={!currentJobId}
        >
          Cancel
        </button>
      </div>
      <div className="mb-2" aria-label="progress">
        Parsing: {progress}%
      </div>
    </div>
  );
}
