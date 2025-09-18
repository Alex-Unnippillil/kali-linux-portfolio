import React, { useState, useRef, useEffect } from 'react';
import { consumeDesktopDrag, isDesktopDragEvent } from '../../../utils/desktopDrag.js';

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
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({});
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [dropError, setDropError] = useState('');

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../../workers/hash-worker.ts', import.meta.url),
    );

    workerRef.current.onmessage = (e) => {
      const { type, loaded, total, results: res } = e.data;
      if (type === 'progress') {
        setProgress(total ? loaded / total : 0);
      } else if (type === 'result') {
        setResults(res);
        setProgress(1);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file || !workerRef.current) return;
    setDropError('');
    setFileName(file.name);
    setResults({});
    setProgress(0);
    workerRef.current.postMessage({ file, algorithms });
  };

  const supportsNativeFiles = (dataTransfer) => {
    if (!dataTransfer?.types) return false;
    return Array.from(dataTransfer.types).includes('Files');
  };

  const onDragEnter = (e) => {
    if (isDesktopDragEvent(e.dataTransfer) || supportsNativeFiles(e.dataTransfer)) {
      e.preventDefault();
      setDragActive(true);
    }
  };

  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragActive(false);
    }
  };

  const onDragOver = (e) => {
    if (isDesktopDragEvent(e.dataTransfer) || supportsNativeFiles(e.dataTransfer)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!dragActive) setDragActive(true);
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    let file = e.dataTransfer.files?.[0] || null;
    if (!file) {
      const payload = consumeDesktopDrag(e.dataTransfer);
      if (payload) {
        if (payload.type === 'file') {
          try {
            file = await payload.getFile();
          } catch (err) {
            setDropError('Failed to read dropped file.');
            return;
          }
        } else {
          setDropError('Only files can be dropped here.');
          return;
        }
      }
    }
    if (!file) return;
    handleFiles([file]);
  };

  const onChange = (e) => {
    handleFiles(e.target.files);
  };

  const copy = (val) => navigator.clipboard?.writeText(val);

  return (
    <div className="bg-gray-700 text-white p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Hash Converter</h2>
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        data-testid="hash-dropzone"
        className={`border-2 border-dashed p-4 text-center rounded cursor-pointer transition-colors ${
          dragActive ? 'border-blue-400 bg-blue-500 bg-opacity-20' : 'border-gray-500'
        }`}
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
      {dropError && <p className="text-red-400 text-sm" role="alert">{dropError}</p>}
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

