"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

import {
  scheduleTask,
  TaskPriority,
  type ScheduledTaskHandle,
} from '../utils/scheduler';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const pendingMessage = useRef<ScheduledTaskHandle | null>(null);

  const clearPending = useCallback(() => {
    pendingMessage.current?.cancel();
    pendingMessage.current = null;
  }, []);

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
    workerRef.current = w;
    return () => {
      clearPending();
      w.terminate();
      workerRef.current = null;
    };
  }, [clearPending, onData]);

  const queueWorkerMessage = useCallback(
    (message: unknown, priority: TaskPriority = TaskPriority.Background) => {
      if (!workerRef.current) return;
      clearPending();
      pendingMessage.current = scheduleTask(
        () => {
          workerRef.current?.postMessage(message);
          pendingMessage.current = null;
        },
        priority,
        { label: 'fixtures:worker-dispatch' },
      );
    },
    [clearPending],
  );

  const loadSample = async () => {
    const res = await fetch('/fixtures/sample.json');
    const text = await res.text();
    queueWorkerMessage({ type: 'parse', text });
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      queueWorkerMessage({ type: 'parse', text: reader.result });
    };
    reader.readAsText(file);
  };

  const cancel = () =>
    queueWorkerMessage({ type: 'cancel' }, TaskPriority.UserVisible);

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

