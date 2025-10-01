import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkerPool } from '../../../hooks/useWorkerPool';
import { workerPool } from '../../../workers/pool/WorkerPool';

const algorithms = [
  'MD5',
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512',
  'SHA3-256',
  'SHA3-512',
  'BLAKE3',
  'CRC32',
];

if (typeof globalThis !== 'undefined' && typeof globalThis.Worker !== 'undefined') {
  workerPool.registerWorker({
    name: 'hash-worker',
    create: () =>
      new Worker(new URL('../../../workers/hash-worker.ts', import.meta.url)),
    maxConcurrency: 2,
  });
}

const HashConverter = () => {
  const { enqueueJob, cancelJob } = useWorkerPool('hash-worker');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({});
  const [fileName, setFileName] = useState('');
  const [currentJobId, setCurrentJobId] = useState(null);

  useEffect(
    () => () => {
      if (currentJobId) {
        cancelJob(currentJobId);
      }
    },
    [cancelJob, currentJobId],
  );

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0];
      if (!file) return;
      if (currentJobId) {
        cancelJob(currentJobId);
      }
      setFileName(file.name);
      setResults({});
      setProgress(0);
      const job = enqueueJob({
        payload: { file, algorithms },
        onProgress: ({ loaded, total }) => {
          setProgress(total ? loaded / total : 0);
        },
      });
      setCurrentJobId(job.jobId);
      job.promise
        .then(({ results: res }) => {
          setResults(res);
          setProgress(1);
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.error(err);
          }
        })
        .finally(() => {
          setCurrentJobId(null);
        });
    },
    [cancelJob, currentJobId, enqueueJob],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const onChange = useCallback(
    (e) => {
      handleFiles(e.target.files);
    },
    [handleFiles],
  );

  const preventDefault = useCallback((e) => e.preventDefault(), []);

  const copy = useCallback((val) => navigator.clipboard?.writeText(val), []);

  const sortedResults = useMemo(
    () =>
      algorithms.reduce((acc, alg) => {
        if (results[alg]) {
          acc.push({ alg, value: results[alg] });
        }
        return acc;
      }, []),
    [results],
  );

  return (
    <div className="bg-gray-700 text-white p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Hash Converter</h2>
      <div
        onDragOver={preventDefault}
        onDrop={onDrop}
        className="border-2 border-dashed border-gray-500 p-4 text-center rounded cursor-pointer"
      >
        <input
          id="hash-file-input"
          type="file"
          className="hidden"
          onChange={onChange}
          aria-label="Select file for hashing"
        />
        <label htmlFor="hash-file-input" className="cursor-pointer block">
          {fileName ? `File: ${fileName}` : 'Drag & drop a file or click to select'}
        </label>
      </div>
      {progress > 0 && progress < 1 && (
        <progress className="w-full" value={progress} max="1" />
      )}
      {sortedResults.length > 0 && (
        <div className="flex flex-col gap-2">
          {sortedResults.map(({ alg, value }) => (
            <div key={alg} className="flex items-center gap-2">
              <span className="w-24 shrink-0">{alg}</span>
              <input
                className="text-black flex-1 p-1 rounded"
                value={value}
                readOnly
                aria-label={`${alg} hash value`}
              />
              <button
                className="bg-gray-600 px-2 py-1 rounded"
                onClick={() => copy(value)}
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HashConverter;
