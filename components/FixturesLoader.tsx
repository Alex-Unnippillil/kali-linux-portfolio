"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

const encodeFrame = (chunk: Uint8Array): Uint8Array => {
  const framed = new Uint8Array(4 + chunk.byteLength);
  new DataView(framed.buffer).setUint32(0, chunk.byteLength);
  framed.set(chunk, 4);
  return framed;
};

export default function FixturesLoader({ onData }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('../workers/fixturesParser.ts', import.meta.url));
    w.onmessage = (e) => {
      const { type, payload } = e.data || {};
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
    return () => w.terminate();
  }, [onData]);

  const sendStreamToWorker = useCallback(
    async (stream: ReadableStream<Uint8Array>, totalBytes?: number) => {
      const worker = workerRef.current;
      if (!worker) return;
      setProgress(0);
      worker.postMessage({ type: 'start', totalBytes });
      const reader = stream.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
          const framed = encodeFrame(chunk);
          worker.postMessage({ type: 'chunk', chunk: framed.buffer }, [framed.buffer]);
        }
      }
      worker.postMessage({ type: 'end' });
    },
    [],
  );

  const loadSample = async () => {
    const res = await fetch('/fixtures/sample.json');
    if (res.body) {
      await sendStreamToWorker(res.body, Number(res.headers.get('content-length') ?? '0') || undefined);
    } else {
      const text = await res.text();
      const stream = new Blob([text]).stream();
      await sendStreamToWorker(stream, text.length);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const stream = file.stream();
    void sendStreamToWorker(stream, file.size);
  };

  const cancel = () => workerRef.current?.postMessage({ type: 'cancel' });

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
