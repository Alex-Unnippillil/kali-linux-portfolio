'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArtifactPayload } from '../utils/collectorWorkerCore';

interface DownloadBundle {
  name: string;
  url: string;
  size: number;
  entries: number;
}

interface WorkerProgressEvent {
  type: 'progress';
  completed: number;
  total: number;
  batchCount: number;
}

interface WorkerCompleteEvent {
  type: 'complete';
  totalBytes: number;
  batches: Array<{ name: string; size: number; entries: number; buffer: ArrayBuffer }>;
}

interface WorkerErrorEvent {
  type: 'error';
  message: string;
}

type WorkerEvent = WorkerProgressEvent | WorkerCompleteEvent | WorkerErrorEvent;

const MAX_BYTES = 10 * 1024 * 1024;

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const generateStubArtifacts = (count: number): ArtifactPayload[] => {
  return Array.from({ length: count }, (_, idx) => ({
    name: `system-audit-${idx + 1}.log`,
    content: [
      `# Artifact ${idx + 1}`,
      'Source: simulated post-exploitation run',
      `Timestamp: ${new Date(2024, 0, 1, 12, 0, 0).toISOString()}`,
      '',
      'Process List:',
      '  - sshd (root)',
      '  - postgres (postgres)',
      '  - nginx (www-data)',
      '',
      'Network Interfaces:',
      '  - eth0 10.0.5.12/24',
      '  - tun0 172.16.0.2/24',
      '',
      'Recent Events:',
      '  - privilege escalation via sudoers misconfiguration',
      '  - credential dump stored in /tmp/.creds',
      '',
      'Log Tail:',
      '  ' + 'AUTH OK '.repeat(128),
      '',
      '--- End of Record ---',
    ].join('\n'),
  }));
};

const Collector: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactPayload[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState({ completed: 0, total: 0, batchCount: 0 });
  const [downloads, setDownloads] = useState<DownloadBundle[]>([]);
  const urlsRef = useRef<string[]>([]);

  const totalArtifacts = artifacts.length;
  const totalSize = useMemo(() => artifacts.reduce((acc, item) => acc + item.content.length, 0), [artifacts]);

  const resetWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const ensureWorker = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!('Worker' in window)) {
      setStatus('error');
      setStatusMessage('Web Workers are not supported in this environment.');
      return null;
    }
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../collectorWorker.ts', import.meta.url));
      workerRef.current.onmessage = (event: MessageEvent<WorkerEvent>) => {
        if (event.data.type === 'progress') {
          setProgress({
            completed: event.data.completed,
            total: event.data.total,
            batchCount: event.data.batchCount,
          });
          return;
        }

        if (event.data.type === 'complete') {
          urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
          urlsRef.current = [];

          const bundles = event.data.batches.map((batch) => {
            const blob = new Blob([batch.buffer], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            urlsRef.current.push(url);
            return {
              name: batch.name,
              url,
              size: batch.size,
              entries: batch.entries,
            };
          });

          setDownloads(bundles);
          setStatus('complete');
          const largest = bundles.reduce((max, bundle) => Math.max(max, bundle.size), 0);
          setStatusMessage(
            bundles.length === 0
              ? 'No artifacts were available for export.'
              : `Generated ${bundles.length} archive${bundles.length > 1 ? 's' : ''}. Largest batch: ${formatBytes(largest)} ` +
                `(combined: ${formatBytes(event.data.totalBytes)}).`,
          );
          return;
        }

        if (event.data.type === 'error') {
          setStatus('error');
          setStatusMessage(event.data.message);
        }
      };
      workerRef.current.onerror = () => {
        setStatus('error');
        setStatusMessage('Collector worker encountered an unexpected error.');
        resetWorker();
      };
    }
    return workerRef.current;
  }, [resetWorker]);

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    resetWorker();
  }, [resetWorker]);

  const addArtifact = () => {
    if (!name.trim() || !content.trim()) {
      return;
    }
    setArtifacts((prev) => [...prev, { name: name.trim(), content }]);
    setName('');
    setContent('');
  };

  const clearArtifacts = () => {
    setArtifacts([]);
    setDownloads([]);
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
    setStatus('idle');
    setStatusMessage('');
    setProgress({ completed: 0, total: 0, batchCount: 0 });
  };

  const handleGenerateStubs = () => {
    const stubs = generateStubArtifacts(500);
    setArtifacts(stubs);
    setStatus('idle');
    setStatusMessage('Loaded 500 simulated artifacts. Ready for packaging.');
    setDownloads([]);
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
    setProgress({ completed: 0, total: stubs.length, batchCount: 0 });
  };

  const packageArtifacts = () => {
    if (artifacts.length === 0) {
      setStatus('error');
      setStatusMessage('Add artifacts or generate stubs before exporting.');
      return;
    }
    const worker = ensureWorker();
    if (!worker) {
      return;
    }
    setStatus('running');
    setStatusMessage('Packaging artifacts in background worker...');
    setProgress({ completed: 0, total: artifacts.length, batchCount: 0 });
    setDownloads([]);
    worker.postMessage({ type: 'start', artifacts, maxBytes: MAX_BYTES });
  };

  const progressPercent = useMemo(() => {
    if (!progress.total) return 0;
    return Math.floor((progress.completed / progress.total) * 100);
  }, [progress]);

  return (
    <div className="mt-8 p-4 border border-gray-800 rounded bg-gray-900/60">
      <h3 className="text-lg font-semibold mb-3">Artifact Collector</h3>
      <p className="text-sm text-gray-300 mb-4">
        Consolidate post-exploitation evidence, compress it below the 10&nbsp;MB transport guideline, and download ready-to-share
        bundles. All compression runs in a dedicated worker so the UI stays responsive.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="artifact-name">
            Artifact Name
          </label>
          <input
            id="artifact-name"
            className="w-full p-2 text-black rounded"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ex: etc-shadow.txt"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="artifact-content">
            Artifact Body
          </label>
          <textarea
            id="artifact-content"
            className="w-full h-24 p-2 text-black rounded"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste output, notes, or decoded secrets here"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={addArtifact} className="px-3 py-1 bg-blue-600 rounded disabled:opacity-50" disabled={!name || !content}>
          Add Artifact
        </button>
        <button onClick={handleGenerateStubs} className="px-3 py-1 bg-purple-600 rounded">
          Load 500 Stub Files
        </button>
        <button onClick={packageArtifacts} className="px-3 py-1 bg-green-600 rounded">
          Package &amp; Download
        </button>
        <button onClick={clearArtifacts} className="px-3 py-1 bg-gray-700 rounded">
          Clear
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-300">
        <p>
          Tracking <span className="font-semibold">{totalArtifacts}</span> artifact{totalArtifacts === 1 ? '' : 's'} (~
          {formatBytes(totalSize)} uncompressed).
        </p>
        {progress.total > 0 && (
          <p>
            Progress: {progress.completed}/{progress.total} ({progressPercent}%){' '}
            {progress.batchCount > 0 && `· Active batches: ${progress.batchCount}`}
          </p>
        )}
        {statusMessage && <p className="mt-2 text-gray-200">{statusMessage}</p>}
      </div>

      {status === 'running' && (
        <div className="mt-4 h-2 w-full bg-gray-800 rounded">
          <div className="h-full bg-green-500 rounded" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {downloads.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Downloadable Batches</h4>
          <ul className="space-y-2">
            {downloads.map((bundle) => (
              <li key={bundle.name} className="flex items-center justify-between bg-gray-800/70 p-2 rounded">
                <div>
                  <p className="font-mono text-sm">{bundle.name}</p>
                  <p className="text-xs text-gray-300">
                    {bundle.entries} item{bundle.entries === 1 ? '' : 's'} · {formatBytes(bundle.size)}
                  </p>
                </div>
                <a className="px-3 py-1 bg-blue-600 rounded" download={bundle.name} href={bundle.url}>
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'error' && (
        <p className="mt-4 text-sm text-red-400">{statusMessage || 'Artifact packaging failed.'}</p>
      )}
    </div>
  );
};

export default Collector;
