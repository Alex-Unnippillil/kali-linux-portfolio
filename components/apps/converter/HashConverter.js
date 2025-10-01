import React, { useState, useRef, useEffect } from 'react';
import BackpressureNotice from '../../system/BackpressureNotice';
import { enqueueJob } from '../../../utils/backpressure';
import useBackpressureJob from '../../../hooks/useBackpressureJob';

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

const HashConverter = () => {
  const workerRef = useRef(null);
  const jobIdRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({});
  const [fileName, setFileName] = useState('');
  const [jobId, setJobId] = useState(null);
  const job = useBackpressureJob(jobId);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
    },
    [],
  );

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults({});
    setProgress(0);

    const jobIdentifier = `hash:${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const handle = enqueueJob(
      'hash:compute',
      {
        run: () =>
          new Promise((resolve, reject) => {
            const worker = new Worker(
              new URL('../../../workers/hash-worker.ts', import.meta.url),
            );
            workerRef.current = worker;
            const cleanup = () => {
              workerRef.current?.terminate();
              workerRef.current = null;
            };
            worker.onerror = (err) => {
              cleanup();
              reject(err?.message || 'Failed to compute hash');
            };
            worker.onmessage = (e) => {
              if (jobIdRef.current !== jobIdentifier) return;
              const { type, loaded, total, results: res } = e.data;
              if (type === 'progress') {
                setProgress(total ? loaded / total : 0);
              } else if (type === 'result') {
                setResults(res);
                setProgress(1);
                cleanup();
                resolve();
              }
            };
            worker.postMessage({ file, algorithms });
          }),
        cancel: () => {
          workerRef.current?.terminate();
          workerRef.current = null;
          setProgress(0);
        },
      },
      {
        id: jobIdentifier,
        label: `Hashing ${file.name}`,
        metadata: { fileName: file.name },
      },
    );

    jobIdRef.current = jobIdentifier;
    setJobId(jobIdentifier);
    handle.done.finally(() => {
      if (jobIdRef.current === jobIdentifier) {
        jobIdRef.current = null;
        setJobId(null);
      }
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const onChange = (e) => {
    handleFiles(e.target.files);
  };

  const preventDefault = (e) => e.preventDefault();

  const copy = (val) => navigator.clipboard?.writeText(val);

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
        />
        <label htmlFor="hash-file-input" className="cursor-pointer block">
          {fileName ? `File: ${fileName}` : 'Drag & drop a file or click to select'}
        </label>
      </div>
      {job && <BackpressureNotice jobId={jobId} className="mt-2" description="Hash computation queued" />}
      {progress > 0 && progress < 1 && (
        <progress className="w-full" value={progress} max="1" />
      )}
      {Object.keys(results).length > 0 && (
        <div className="flex flex-col gap-2">
          {algorithms.map(
            (alg) =>
              results[alg] && (
                <div key={alg} className="flex items-center gap-2">
                  <span className="w-24 shrink-0">{alg}</span>
                  <input
                    className="text-black flex-1 p-1 rounded"
                    value={results[alg]}
                    readOnly
                  />
                  <button
                    className="bg-gray-600 px-2 py-1 rounded"
                    onClick={() => copy(results[alg])}
                  >
                    Copy
                  </button>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
};

export default HashConverter;

