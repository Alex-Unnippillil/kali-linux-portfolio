"use client";

import { useState, useEffect, useCallback } from 'react';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

type WorkerParseSource =
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string }
  | { kind: 'text'; text: string };

type WorkerProgressMessage = {
  type: 'progress';
  payload: {
    loaded: number;
    total: number | null;
    items: number;
    lines: number;
    done?: boolean;
  };
};

type WorkerResultMessage = {
  type: 'result';
  payload: {
    rows: any[];
    errors: { line: number; message: string; raw: string }[];
  };
};

type WorkerErrorMessage = { type: 'error'; payload: { message: string } };
type WorkerCancelledMessage = { type: 'cancelled' };

type WorkerMessage =
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage
  | WorkerCancelledMessage;

type LoaderStatus = 'idle' | 'parsing' | 'complete' | 'error' | 'cancelled';

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [itemsParsed, setItemsParsed] = useState(0);
  const [status, setStatus] = useState<LoaderStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<WorkerResultMessage['payload']['errors']>([]);
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('../workers/fixturesParser.ts', import.meta.url));
    w.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === 'progress') {
        const { loaded, total, items, done } = message.payload;
        setItemsParsed(items);
        setProgress((prev) => {
          if (typeof total === 'number' && total > 0) {
            return Math.min(100, Math.round((loaded / total) * 100));
          }
          if (done) return 100;
          if (prev >= 99) return prev;
          return Math.min(99, prev + 1);
        });
        setStatus((prev) => (prev === 'idle' ? 'parsing' : prev));
      } else if (message.type === 'result') {
        const { rows, errors } = message.payload;
        onData(rows);
        setParseErrors(errors);
        setStatus('complete');
        setProgress(100);
        setItemsParsed(rows.length);
        try {
          localStorage.setItem('fixtures-last', JSON.stringify(rows));
        } catch {
          /* ignore */
        }
      } else if (message.type === 'error') {
        setStatus('error');
        setErrorMessage(message.payload.message || 'Failed to parse fixtures');
      } else if (message.type === 'cancelled') {
        setStatus('cancelled');
      }
    };
    setWorker(w);
    return () => w.terminate();
  }, [onData]);

  const startParse = useCallback(
    (source: WorkerParseSource) => {
      if (!worker) return;
      setStatus('parsing');
      setErrorMessage(null);
      setParseErrors([]);
      setProgress(0);
      setItemsParsed(0);
      worker.postMessage({ type: 'parse', source });
    },
    [worker],
  );

  const loadSample = useCallback(() => {
    startParse({ kind: 'url', url: '/fixtures/sample.json' });
  }, [startParse]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startParse({ kind: 'file', file });
    e.target.value = '';
  };

  const cancel = () => {
    setStatus('cancelled');
    setProgress(0);
    setItemsParsed(0);
    setParseErrors([]);
    setErrorMessage(null);
    worker?.postMessage({ type: 'cancel' });
  };

  const statusLabel: Record<LoaderStatus, string> = {
    idle: 'Idle',
    parsing: 'Parsing…',
    complete: 'Complete',
    error: 'Error',
    cancelled: 'Cancelled',
  };

  return (
    <div className="text-xs" aria-label="fixtures loader">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={loadSample}
          className="px-2 py-1 bg-ub-cool-grey text-white"
          type="button"
          disabled={!worker}
        >
          Load Sample
        </button>
        <label className="px-2 py-1 bg-ub-cool-grey text-white cursor-pointer">
          Import
          <input
            type="file"
            onChange={onFile}
            className="hidden"
            aria-label="import fixture"
            disabled={!worker}
          />
        </label>
        <button onClick={cancel} className="px-2 py-1 bg-ub-red text-white" type="button" disabled={!worker}>
          Cancel
        </button>
      </div>
      <div className="mb-2" aria-label="progress">
        Parsing: {progress}% ({itemsParsed} rows) — Status: {statusLabel[status]}
      </div>
      {parseErrors.length > 0 && (
        <div className="mb-2 text-ub-orange" aria-label="fixture warnings">
          <p className="mb-1">Skipped {parseErrors.length} invalid row(s). Showing first issues:</p>
          <ul className="list-disc list-inside space-y-1">
            {parseErrors.slice(0, 3).map((err) => (
              <li key={`${err.line}-${err.message}`}>Line {err.line}: {err.message}</li>
            ))}
          </ul>
        </div>
      )}
      {errorMessage && (
        <div className="text-red-500" aria-live="polite">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
