import React, { useState, useRef, useEffect } from 'react';
import copyToClipboard from '../../../utils/clipboard';

const algorithms = ['SHA-256'];

const PAGE_SIZE = 10;

const HashConverter = () => {
  const workerRef = useRef(null);
  const queueRef = useRef([]);
  const indexRef = useRef(0);

  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(0);
  const [announce, setAnnounce] = useState('');
  const announceTimer = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../../workers/hash-worker.ts', import.meta.url),
    );

    workerRef.current.onmessage = (e) => {
      const { type, loaded, total, results: res } = e.data;
      if (type === 'progress') {
        setProgress(total ? loaded / total : 0);
      } else if (type === 'result') {
        const file = queueRef.current[indexRef.current];
        setResults((r) => [...r, { name: file.name, ...res }]);
        indexRef.current += 1;
        setProgress(0);
        if (indexRef.current < queueRef.current.length) {
          workerRef.current.postMessage({
            file: queueRef.current[indexRef.current],
            algorithms,
          });
        }
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const startQueue = (files) => {
    const arr = Array.from(files || []);
    if (!arr.length || !workerRef.current) return;
    queueRef.current = arr;
    indexRef.current = 0;
    setResults([]);
    setPage(0);
    setProgress(0);
    workerRef.current.postMessage({ file: arr[0], algorithms });
  };

  const onDrop = (e) => {
    e.preventDefault();
    startQueue(e.dataTransfer.files);
  };

  const onChange = (e) => {
    startQueue(e.target.files);
  };

  const preventDefault = (e) => e.preventDefault();

  const copy = async (val, alg) => {
    if (!val) return;
    const success = await copyToClipboard(val);
    setAnnounce(success ? `${alg} checksum copied` : `Failed to copy ${alg}`);
    clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(''), 2000);
  };

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const pageResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const processing =
    queueRef.current.length > 0 && indexRef.current < queueRef.current.length;

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
          multiple
          className="hidden"
          onChange={onChange}
          aria-label="Select files"
        />
        <label htmlFor="hash-file-input" className="cursor-pointer block">
          {queueRef.current.length
            ? `${queueRef.current.length} file${
                queueRef.current.length > 1 ? 's' : ''
              } selected`
            : 'Drag & drop files or click to select'}
        </label>
      </div>
      {processing && (
        <div className="flex flex-col gap-1">
          <span>
            Processing {indexRef.current + 1} of {queueRef.current.length}:{' '}
            {queueRef.current[indexRef.current]?.name}
          </span>
          <progress className="w-full" value={progress} max="1" />
        </div>
      )}
      {pageResults.length > 0 && (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">File</th>
                {algorithms.map((alg) => (
                  <th key={alg} className="text-left">
                    {alg}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageResults.map((r, idx) => (
                <tr key={`${r.name}-${idx}`}>
                  <td className="pr-2 align-top break-all">{r.name}</td>
                  {algorithms.map((alg) => {
                    const val = r[alg];
                    return (
                      <td key={alg} className="pr-2 align-top">
                        <div className="flex items-center gap-2">
                          <input
                            className="font-mono text-black flex-1 p-1 rounded"
                            value={val || ''}
                            readOnly
                            aria-label={`${alg} checksum`}
                          />
                          <button
                            className="bg-ubt-blue text-white px-2 py-1 rounded disabled:opacity-50"
                            onClick={() => copy(val, alg)}
                            aria-label={`Copy ${alg} checksum for ${r.name}`}
                            disabled={!val}
                          >
                            Copy
                          </button>
                        </div>
                        {val === undefined && (
                          <span className="text-red-500 text-xs">Error</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
                className="bg-gray-600 px-2 py-1 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(p + 1, totalPages - 1))
                }
                disabled={page >= totalPages - 1}
                className="bg-gray-600 px-2 py-1 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      <div aria-live="polite" className="h-4 text-sm mt-1">{announce}</div>
    </div>
  );
};

export default HashConverter;

