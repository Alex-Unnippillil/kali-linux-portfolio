'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EvidenceFileMetadata,
  VerificationProgress,
  VerificationStatus,
  verifyEvidenceFiles,
} from '../utils/checksums';

type FileState = VerificationStatus | 'pending' | 'verifying';

interface FileStatusEntry {
  id: string;
  name: string;
  expectedChecksum: string;
  status: FileState;
  actualChecksum?: string;
  durationMs?: number;
  message?: string;
}

interface VerifierProps {
  files: EvidenceFileMetadata[];
  batchSize?: number;
}

const statusStyles: Record<FileState, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-700 text-gray-100' },
  verifying: { label: 'Verifying', className: 'bg-blue-500 text-white' },
  match: { label: 'Verified', className: 'bg-green-600 text-white' },
  mismatch: { label: 'Mismatch', className: 'bg-yellow-500 text-gray-900' },
  error: { label: 'Error', className: 'bg-red-600 text-white' },
  skipped: { label: 'Skipped', className: 'bg-gray-500 text-gray-100' },
};

const createInitialMap = (files: EvidenceFileMetadata[]): Record<string, FileStatusEntry> => {
  const map: Record<string, FileStatusEntry> = {};
  files.forEach((file) => {
    map[file.id] = {
      id: file.id,
      name: file.name,
      expectedChecksum: file.expectedChecksum,
      status: 'pending',
    };
  });
  return map;
};

const roundDuration = (value?: number) => {
  if (typeof value !== 'number') {
    return undefined;
  }
  if (value < 1) {
    return '<1';
  }
  return value.toFixed(0);
};

const Verifier: React.FC<VerifierProps> = ({ files, batchSize }) => {
  const [statuses, setStatuses] = useState<Record<string, FileStatusEntry>>(() =>
    createInitialMap(files),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number }>(
    () => ({ processed: 0, total: files.length }),
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setStatuses((prev) => {
      const next = createInitialMap(files);
      Object.keys(next).forEach((id) => {
        if (prev[id]) {
          next[id] = { ...next[id], ...prev[id], status: prev[id].status };
        }
      });
      return next;
    });
    setProgress((prev) => ({ processed: Math.min(prev.processed, files.length), total: files.length }));
  }, [files]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateStatus = useCallback((id: string, patch: Partial<FileStatusEntry>) => {
    setStatuses((prev) => {
      const current = prev[id];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [id]: { ...current, ...patch },
      };
    });
  }, []);

  const handleFileStart = useCallback((fileId: string) => {
    updateStatus(fileId, { status: 'verifying', actualChecksum: undefined, durationMs: undefined, message: undefined });
  }, [updateStatus]);

  const handleProgress = useCallback(
    ({ processed, total, result }: VerificationProgress) => {
      setProgress({ processed, total });
      const patch: Partial<FileStatusEntry> = {
        status: result.status,
        actualChecksum: result.actualChecksum,
        durationMs: result.durationMs,
        message: result.message,
      };
      updateStatus(result.id, patch);
    },
    [updateStatus],
  );

  const runVerification = useCallback(async () => {
    if (files.length === 0) {
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setError(null);
    setProgress({ processed: 0, total: files.length });
    setStatuses((prev) => {
      const next = { ...prev };
      files.forEach((file) => {
        const current = next[file.id];
        if (current) {
          next[file.id] = {
            ...current,
            status: 'pending',
            actualChecksum: undefined,
            durationMs: undefined,
            message: undefined,
          };
        }
      });
      return next;
    });

    try {
      await verifyEvidenceFiles(files, {
        batchSize,
        signal: controller.signal,
        onFileStart: (file) => handleFileStart(file.id),
        onProgress: handleProgress,
      });
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Verification failed');
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [batchSize, files, handleFileStart, handleProgress]);

  const cancelVerification = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  }, []);

  const summary = useMemo(() => {
    const counts: Record<FileState, number> = {
      pending: 0,
      verifying: 0,
      match: 0,
      mismatch: 0,
      error: 0,
      skipped: 0,
    };
    Object.values(statuses).forEach((entry) => {
      counts[entry.status] += 1;
    });
    return counts;
  }, [statuses]);

  const progressPercent = useMemo(() => {
    if (progress.total === 0) {
      return 0;
    }
    return Math.round((progress.processed / progress.total) * 100);
  }, [progress]);

  const orderedFiles = useMemo(
    () =>
      files
        .map((file) => statuses[file.id])
        .filter((entry): entry is FileStatusEntry => Boolean(entry)),
    [files, statuses],
  );

  return (
    <div className="bg-gray-900 text-white p-4 space-y-4 rounded-lg border border-gray-800">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Checksum Verifier</h2>
          <p className="text-sm text-gray-400">
            Validate evidence integrity without blocking the interface. Files are processed in
            batches and progress updates appear instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded bg-blue-600 disabled:bg-blue-900 disabled:cursor-not-allowed"
            onClick={runVerification}
            disabled={isRunning || files.length === 0}
          >
            {isRunning ? 'Verifying…' : 'Start Verification'}
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed"
            onClick={cancelVerification}
            disabled={!isRunning}
          >
            Cancel
          </button>
        </div>
      </header>

      <section className="space-y-2">
        <div className="h-2 bg-gray-800 rounded">
          <div
            className="h-2 rounded bg-green-500 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-sm text-gray-300 flex justify-between">
          <span>
            {progress.processed}/{progress.total} processed ({progressPercent}% complete)
          </span>
          <span>
            {summary.match} verified • {summary.mismatch} mismatched • {summary.error} errors •{' '}
            {summary.skipped} skipped
          </span>
        </div>
      </section>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <section>
        <h3 className="text-md font-medium mb-2">File status</h3>
        <div className="max-h-72 overflow-auto divide-y divide-gray-800 border border-gray-800 rounded">
          {orderedFiles.map((entry) => (
            <article key={entry.id} className="p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-sm">{entry.name}</p>
                <p className="text-xs text-gray-400 break-all">
                  Expected: <span className="font-mono">{entry.expectedChecksum}</span>
                </p>
                {entry.actualChecksum && (
                  <p className="text-xs text-gray-400 break-all">
                    Actual: <span className="font-mono">{entry.actualChecksum}</span>
                  </p>
                )}
                {entry.message && (
                  <p className="text-xs text-red-400">{entry.message}</p>
                )}
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1 min-w-[120px]">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[entry.status].className}`}>
                  {statusStyles[entry.status].label}
                </span>
                {typeof entry.durationMs === 'number' && (
                  <span className="text-[0.65rem] text-gray-400">
                    {roundDuration(entry.durationMs)} ms
                  </span>
                )}
              </div>
            </article>
          ))}
          {orderedFiles.length === 0 && (
            <div className="p-4 text-sm text-gray-400">No files queued for verification.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Verifier;

