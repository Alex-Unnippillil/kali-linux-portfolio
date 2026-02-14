"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

import { parseFixtures } from '@/src/workers/parsing';
import type { WorkerPoolTask } from '@/src/workers/workerPool';
import { isTaskCancelledError } from '@/src/workers/workerPool';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const taskRef = useRef<WorkerPoolTask<any[]> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    taskRef.current?.cancel();
  }, []);

  const handleResult = useCallback(
    (rows: any[], handle: WorkerPoolTask<any[]>) => {
      if (!mountedRef.current || taskRef.current !== handle) return;
      onData(rows);
      try {
        localStorage.setItem('fixtures-last', JSON.stringify(rows));
      } catch {
        /* ignore */
      }
    },
    [onData],
  );

  const startParse = useCallback(
    (text: string) => {
      if (!text) return;
      taskRef.current?.cancel();
      setProgress(0);
      const handle = parseFixtures(text, {
        onProgress: (value) => {
          if (!mountedRef.current) return;
          setProgress(value);
        },
      });
      taskRef.current = handle;
      handle.promise
        .then((rows) => handleResult(rows, handle))
        .catch((err) => {
          if (isTaskCancelledError(err)) return;
          console.error(err);
        })
        .finally(() => {
          if (taskRef.current === handle) {
            taskRef.current = null;
          }
        });
    },
    [handleResult],
  );

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch('/fixtures/sample.json');
      const text = await res.text();
      startParse(text);
    } catch (err) {
      console.error(err);
    }
  }, [startParse]);

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    taskRef.current?.cancel();
    setProgress(0);
  }, []);

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

