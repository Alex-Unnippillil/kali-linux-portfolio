import React, { useRef, useState } from 'react';
import { guardFile, fetchWithRetry, wrapWorker, useToastLogger } from '@lib/utilities';

const UtilitiesDemo: React.FC = () => {
  const { message, toast } = useToastLogger();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      guardFile(file, { maxSize: 1024 * 1024, mimeTypes: ['text/plain'] });
      toast('File accepted');
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const doFetch = async () => {
    try {
      const res = await fetchWithRetry('https://httpbin.org/status/200');
      toast(`Fetch ${res.ok ? 'succeeded' : 'failed'}`);
    } catch (err) {
      toast('Fetch failed');
    }
  };

  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const workerDemo = async () => {
    const worker = new Worker(new URL('./utilities.worker.ts', import.meta.url));
    const call = wrapWorker<{ n: number }, { result: number }, number>(worker);
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    try {
      const res = await call(
        { n: 5_000_000 },
        {
          signal: controller.signal,
          onProgress: (p) => setProgress(p),
        },
      );
      toast(`Worker result ${res.result}`);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      worker.terminate();
      abortRef.current = null;
    }
  };

  const cancelWorker = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="p-4 space-y-2">
      <input type="file" onChange={handleFile} />
      <div className="space-x-2">
        <button className="px-2 py-1 bg-blue-600 text-white" onClick={doFetch}>
          Fetch with retry
        </button>
        <button className="px-2 py-1 bg-green-600 text-white" onClick={workerDemo}>
          Worker demo
        </button>
        {abortRef.current && (
          <button className="px-2 py-1 bg-red-600 text-white" onClick={cancelWorker}>
            Cancel
          </button>
        )}
      </div>
      {abortRef.current && (
        <div className="w-full bg-gray-700 h-2 rounded">
          <div
            className="bg-green-500 h-2 rounded"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
      {message && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-2 py-1" role="alert">
          {message}
        </div>
      )}
    </div>
  );
};

export const displayUtilitiesDemo = () => <UtilitiesDemo />;
export default UtilitiesDemo;
