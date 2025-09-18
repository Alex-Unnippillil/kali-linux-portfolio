'use client';

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import type {
  Algorithm,
  ProgressMessage,
  ResultMessage,
} from '../../workers/hash-worker';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SIZE_LABEL = '5 MB';
type WorkerMessage = ProgressMessage | ResultMessage;
type DigestAlgorithm = Extract<Algorithm, 'MD5' | 'SHA-1' | 'SHA-256'>;
const HASH_ALGORITHMS: DigestAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256'];

const INITIAL_RESULTS: Record<DigestAlgorithm, string> = {
  MD5: '',
  'SHA-1': '',
  'SHA-256': '',
};

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
};

const CryptoToolkit = () => {
  const workerRef = useRef<Worker | null>(null);
  const copyResetRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [workerReady, setWorkerReady] = useState<boolean>(
    () => typeof window !== 'undefined' && typeof Worker !== 'undefined',
  );
  const [textInput, setTextInput] = useState('');
  const [progress, setProgress] = useState(0);
  const [isHashing, setIsHashing] = useState(false);
  const [activeInput, setActiveInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<DigestAlgorithm | null>(null);
  const [results, setResults] = useState<Record<DigestAlgorithm, string>>({
    ...INITIAL_RESULTS,
  });
  const [isPending, startTransition] = useTransition();

  const resetCopyNotice = useCallback(() => {
    if (copyResetRef.current) {
      window.clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, []);

  useEffect(() => () => resetCopyNotice(), [resetCopyNotice]);

  const handleWorkerMessage = useCallback(
    (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (!message) return;

      if (message.type === 'progress') {
        const { loaded, total } = message;
        const ratio =
          total > 0 ? Math.min(loaded / total, 1) : loaded > 0 ? 1 : 0;
        startTransition(() => {
          setProgress(ratio);
        });
      } else if (message.type === 'result') {
        startTransition(() => {
          setResults({
            MD5: message.results.MD5 ?? '',
            'SHA-1': message.results['SHA-1'] ?? '',
            'SHA-256': message.results['SHA-256'] ?? '',
          });
          setProgress(1);
          setIsHashing(false);
        });
      }
    },
    [startTransition],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setWorkerReady(false);
      setError('Web workers are not supported in this environment.');
      return;
    }

    const worker = new Worker(
      new URL('../../workers/hash-worker.ts', import.meta.url),
    );
    workerRef.current = worker;
    setWorkerReady(true);

    worker.onerror = () => {
      setError('The hashing worker encountered an error.');
      setIsHashing(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    worker.onmessage = handleWorkerMessage as (event: MessageEvent) => void;
  }, [handleWorkerMessage]);

  const beginHash = useCallback(
    (payload: { file?: File; text?: string; label: string }) => {
      const worker = workerRef.current;
      if (!worker) {
        setError('Hash worker is unavailable.');
        return;
      }

      resetCopyNotice();
      startTransition(() => {
        setResults({ ...INITIAL_RESULTS });
        setProgress(0);
        setIsHashing(true);
        setError('');
        setActiveInput(payload.label);
        setCopied(null);
      });

      worker.postMessage({
        algorithms: HASH_ALGORITHMS,
        ...(payload.file ? { file: payload.file } : {}),
        ...(payload.text !== undefined ? { text: payload.text } : {}),
      });
    },
    [resetCopyNotice, startTransition],
  );

  const handleTextHash = useCallback(() => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(textInput);
    const size = encoded.byteLength;

    if (size > MAX_SIZE_BYTES) {
      setError(
        `Text input is ${formatBytes(size)} which exceeds the ${MAX_SIZE_LABEL} limit.`,
      );
      setIsHashing(false);
      setActiveInput('');
      return;
    }

    beginHash({
      text: textInput,
      label: `Text input • ${formatBytes(size)}`,
    });
  }, [beginHash, textInput]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = '';

      if (file.size > MAX_SIZE_BYTES) {
        setError(
          `"${file.name}" is ${formatBytes(file.size)} which exceeds the ${MAX_SIZE_LABEL} limit.`,
        );
        setIsHashing(false);
        setActiveInput('');
        return;
      }

      beginHash({
        file,
        label: `${file.name} • ${formatBytes(file.size)}`,
      });
    },
    [beginHash],
  );

  const handleCopy = useCallback(
    (algorithm: DigestAlgorithm) => {
      const value = results[algorithm];
      if (!value) return;

      const applyNotice = () => {
        startTransition(() => {
          setCopied(algorithm);
        });
        resetCopyNotice();
        copyResetRef.current = window.setTimeout(() => {
          startTransition(() => setCopied(null));
        }, 1500);
      };

      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(value)
          .then(applyNotice)
          .catch(applyNotice);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('aria-hidden', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textarea);
        }
        applyNotice();
      }
    },
    [resetCopyNotice, results, startTransition],
  );

  const progressPercent = Math.round(progress * 100);
  const isBusy = isHashing || isPending;

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Crypto Toolkit</h1>
          <p className="text-sm text-gray-300">
            Stream large payloads (up to {MAX_SIZE_LABEL}) through a Web Worker to
            compute MD5, SHA-1, and SHA-256 digests without blocking the UI.
          </p>
        </header>

        {!workerReady && (
          <div className="rounded border border-red-500 bg-red-900/40 p-3 text-sm text-red-200">
            Web workers are unavailable, so hashing cannot be performed in this
            environment.
          </div>
        )}

        {error && (
          <div className="rounded border border-red-500 bg-red-900/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="rounded-lg bg-black/40 p-4 shadow-lg shadow-black/40">
          <label htmlFor="crypto-toolkit-text" className="mb-2 block text-sm font-semibold">
            Text to hash
          </label>
          <textarea
            id="crypto-toolkit-text"
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            className="h-32 w-full resize-y rounded border border-gray-600 bg-gray-900/80 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
            placeholder="Paste or type text to hash..."
            aria-label="Text to hash"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTextHash}
              disabled={!workerReady || isBusy}
              className={`rounded px-3 py-2 text-sm font-medium transition ${
                !workerReady || isBusy
                  ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              Hash text
            </button>
            <label
              htmlFor="crypto-toolkit-file"
              className={`cursor-pointer rounded px-3 py-2 text-sm font-medium transition ${
                !workerReady || isBusy
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-purple-600 hover:bg-purple-500'
              }`}
            >
              Upload file
              <input
                ref={fileInputRef}
                id="crypto-toolkit-file"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                disabled={!workerReady || isBusy}
                aria-label="Select a file to hash"
              />
            </label>
            {activeInput && (
              <span className="text-xs text-gray-300">Processing: {activeInput}</span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Files and text larger than {MAX_SIZE_LABEL} are rejected before hashing to
            keep the worker responsive.
          </p>
        </section>

        <section className="rounded-lg bg-black/40 p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between text-sm font-medium">
            <span id="crypto-toolkit-progress-label">Progress</span>
            <span data-testid="hash-progress">{progressPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby="crypto-toolkit-progress-label"
            className="mt-2 h-3 w-full rounded bg-gray-700"
          >
            <div
              className="h-3 rounded bg-blue-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {isBusy ? 'Hashing in progress…' : progressPercent === 100 ? 'Hash complete.' : 'Awaiting input.'}
          </div>
        </section>

        <section className="rounded-lg bg-black/40 p-4 shadow-lg shadow-black/40">
          <h2 className="mb-3 text-lg font-semibold">Digests</h2>
          <div className="flex flex-col gap-3">
            {HASH_ALGORITHMS.map((algorithm) => (
              <div key={algorithm} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{algorithm}</span>
                  {copied === algorithm && (
                    <span className="text-xs text-green-300">Copied!</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    data-testid={`hash-output-${algorithm}`}
                    value={results[algorithm]}
                    readOnly
                    className="flex-1 rounded border border-gray-700 bg-gray-900/80 p-2 text-xs text-white"
                    placeholder="Awaiting result"
                    aria-label={`${algorithm} digest`}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(algorithm)}
                    disabled={!results[algorithm]}
                    aria-label={`Copy ${algorithm} hash`}
                    className={`rounded px-3 py-2 text-sm font-medium transition ${
                      results[algorithm]
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'cursor-not-allowed bg-gray-800 text-gray-500'
                    }`}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CryptoToolkit;
