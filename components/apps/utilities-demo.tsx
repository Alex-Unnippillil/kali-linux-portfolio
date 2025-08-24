import React from 'react';
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

  const workerDemo = async () => {
    const worker = new Worker(new URL('./utilities.worker.ts', import.meta.url));
    const call = wrapWorker<number, number>(worker);
    const result = await call(4);
    worker.terminate();
    toast(`Worker result ${result}`);
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
      </div>
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
