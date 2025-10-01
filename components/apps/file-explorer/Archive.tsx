'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ArchiveEntry } from './archiveWorkerCore';

interface ArchiveProps {
  directory?: FileSystemDirectoryHandle | null;
  onAfterWrite?: () => void | Promise<void>;
}

type Mode = 'create' | 'extract';
type Format = 'zip' | 'tar';

type WorkerEvent =
  | { id: string; type: 'progress'; processed: number; total: number }
  | { id: string; type: 'result'; buffer: ArrayBuffer; mimeType: string; name: string }
  | { id: string; type: 'entry'; entry: { path: string; chunk: ArrayBuffer; final: boolean; directory: boolean; permissions?: number; lastModified?: number } }
  | { id: string; type: 'error'; message: string }
  | { id: string; type: 'cancelled' }
  | { id: string; type: 'done' };

interface PendingFileWrite {
  writer: FileSystemWritableFileStream;
  directory: FileSystemDirectoryHandle;
}

export default function Archive({ directory, onAfterWrite }: ArchiveProps) {
  const [mode, setMode] = useState<Mode>('create');
  const [format, setFormat] = useState<Format>('zip');
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [destination, setDestination] = useState<FileSystemDirectoryHandle | null>(
    directory ?? null,
  );
  const [status, setStatus] = useState<string>('Idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressBytes, setProgressBytes] = useState<{ processed: number; total: number } | null>(
    null,
  );
  const [activeName, setActiveName] = useState<string>('archive.zip');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const jobRef = useRef<{ id: string; type: Mode; format: Format; name: string } | null>(null);
  const destinationRef = useRef<FileSystemDirectoryHandle | null>(destination);
  const pendingWritesRef = useRef<Promise<void>>(Promise.resolve());
  const openWritersRef = useRef<Map<string, PendingFileWrite>>(new Map());

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  useEffect(() => {
    setDestination(directory ?? null);
  }, [directory]);

  useEffect(() => {
    if (format === 'zip' && !activeName.endsWith('.zip')) {
      setActiveName((current) => {
        const base = current.replace(/\.(zip|tar)$/i, '');
        return `${base || 'archive'}.zip`;
      });
    } else if (format === 'tar' && !activeName.endsWith('.tar')) {
      setActiveName((current) => {
        const base = current.replace(/\.(zip|tar)$/i, '');
        return `${base || 'archive'}.tar`;
      });
    }
  }, [format, activeName]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('./archive.worker.ts', import.meta.url));
    const handleMessage = (event: MessageEvent<WorkerEvent>) => {
      const job = jobRef.current;
      if (!job || event.data.id !== job.id) return;
      const payload = event.data;
      switch (payload.type) {
        case 'progress': {
          const { processed, total } = payload;
          setProgressBytes({ processed, total });
          setProgress(total ? Math.min(processed / total, 1) : 0);
          break;
        }
        case 'result': {
          const blob = new Blob([payload.buffer], { type: payload.mimeType });
          if (destinationRef.current) {
            queueWrite(async () => {
              await writeArchiveToDirectory(payload.name, blob);
            });
          } else {
            setDownloadUrl((current) => {
              if (current) URL.revokeObjectURL(current);
              const url = URL.createObjectURL(blob);
              return url;
            });
          }
          break;
        }
        case 'entry': {
          queueWrite(async () => {
            if (!destinationRef.current) return;
            await writeExtractedChunk(destinationRef.current, payload.entry);
          });
          break;
        }
        case 'error': {
          setError(payload.message);
          setIsRunning(false);
          jobRef.current = null;
          break;
        }
        case 'cancelled': {
          setStatus('Cancelled');
          setIsRunning(false);
          jobRef.current = null;
          break;
        }
        case 'done': {
          finalizeWrites().then(() => {
            setIsRunning(false);
            setStatus('Completed');
            jobRef.current = null;
            onAfterWrite?.();
          });
          break;
        }
        default:
          break;
      }
    };
    worker.addEventListener('message', handleMessage);
    workerRef.current = worker;
    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [onAfterWrite]);

  useEffect(() => () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  const supportsPickers = useMemo(
    () => typeof window !== 'undefined' && !!window.showOpenFilePicker,
    [],
  );

  const queueWrite = (fn: () => Promise<void>) => {
    pendingWritesRef.current = pendingWritesRef.current
      .then(fn)
      .catch((writeError) => {
        console.error(writeError);
        setError((writeError as Error).message);
      });
  };

  const finalizeWrites = () => pendingWritesRef.current.catch(() => undefined);

  const requestDirectoryPermission = async (handle: FileSystemDirectoryHandle) => {
    if (handle.requestPermission) {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') throw new Error('Write permission denied');
    }
  };

  const applyMetadataIfSupported = async (
    handle: FileSystemFileHandle | FileSystemDirectoryHandle,
    permissions?: number,
  ) => {
    if (!permissions) return;
    try {
      const maybe = handle as unknown as { setMetadata?: (options: { mode: number }) => Promise<void> };
      await maybe.setMetadata?.({ mode: permissions });
    } catch {
      // Best effort only.
    }
  };

  const writeArchiveToDirectory = async (name: string, blob: Blob) => {
    const targetDir = destinationRef.current;
    if (!targetDir) return;
    await requestDirectoryPermission(targetDir);
    const handle = await targetDir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  };

  const ensureDirectoryPath = async (
    root: FileSystemDirectoryHandle,
    path: string,
  ): Promise<FileSystemDirectoryHandle> => {
    let dir = root;
    const segments = path
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    for (const segment of segments) {
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }
    return dir;
  };

  const writeExtractedChunk = async (
    root: FileSystemDirectoryHandle,
    entry: WorkerEvent & { type: 'entry' }['entry'],
  ) => {
    await requestDirectoryPermission(root);
    const chunk = new Uint8Array(entry.chunk);
    if (entry.directory) {
      const dirHandle = await ensureDirectoryPath(root, entry.path);
      await applyMetadataIfSupported(dirHandle, entry.permissions);
      return;
    }
    const segments = entry.path.split('/');
    const filename = segments.pop();
    if (!filename) return;
    const parentPath = segments.join('/');
    const parentDir = parentPath ? await ensureDirectoryPath(root, parentPath) : root;
    const key = entry.path;
    let pending = openWritersRef.current.get(key);
    if (!pending) {
      const fileHandle = await parentDir.getFileHandle(filename, { create: true });
      await applyMetadataIfSupported(fileHandle, entry.permissions);
      const writer = await fileHandle.createWritable();
      pending = { writer, directory: parentDir };
      openWritersRef.current.set(key, pending);
    }
    if (chunk.byteLength) {
      await pending.writer.write(chunk);
    }
    if (entry.final) {
      await pending.writer.close();
      openWritersRef.current.delete(key);
    }
  };

  const cancelJob = () => {
    const job = jobRef.current;
    if (!job || !workerRef.current) return;
    workerRef.current.postMessage({ id: job.id, action: 'cancel' });
  };

  const collectDirectoryEntries = async (
    handle: FileSystemDirectoryHandle,
    basePath = handle.name,
  ): Promise<ArchiveEntry[]> => {
    const collected: ArchiveEntry[] = [
      {
        path: basePath,
        directory: true,
        permissions: 0o755,
        lastModified: Date.now(),
      },
    ];
    for await (const [name, child] of handle.entries()) {
      if (child.kind === 'directory') {
        const childBase = `${basePath}/${name}`;
        collected.push(...(await collectDirectoryEntries(child, childBase)));
      } else if (child.kind === 'file') {
        const file = await child.getFile();
        collected.push({
          path: `${basePath}/${name}`,
          file,
          directory: false,
          permissions: 0o644,
          lastModified: file.lastModified,
        });
      }
    }
    return collected;
  };

  const addFiles = async () => {
    if (!supportsPickers) return;
    try {
      const handles = await window.showOpenFilePicker({ multiple: true });
      const next: ArchiveEntry[] = [];
      for (const handle of handles) {
        const file = await handle.getFile();
        next.push({
          path: file.name,
          file,
          permissions: 0o644,
          lastModified: file.lastModified,
        });
      }
      setEntries((current) => [...current, ...next]);
    } catch (pickerError) {
      if ((pickerError as DOMException).name !== 'AbortError') {
        setError((pickerError as Error).message);
      }
    }
  };

  const addDirectoryFromPicker = async () => {
    if (!supportsPickers) return;
    try {
      const handle = await window.showDirectoryPicker();
      const collected = await collectDirectoryEntries(handle, handle.name || 'directory');
      setEntries((current) => [...current, ...collected]);
    } catch (pickerError) {
      if ((pickerError as DOMException).name !== 'AbortError') {
        setError((pickerError as Error).message);
      }
    }
  };

  const useCurrentDirectory = async () => {
    if (!directory) return;
    try {
      const collected = await collectDirectoryEntries(directory, directory.name || 'current');
      setEntries(collected);
    } catch (dirError) {
      setError((dirError as Error).message);
    }
  };

  const removeEntry = (path: string) => {
    setEntries((current) => current.filter((entry) => entry.path !== path));
  };

  const chooseArchiveFile = async () => {
    if (!supportsPickers) return;
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'Archive',
            accept: {
              'application/zip': ['.zip'],
              'application/x-tar': ['.tar'],
            },
          },
        ],
      });
      const file = await handle.getFile();
      setArchiveFile(file);
      if (file.name.endsWith('.tar')) setFormat('tar');
      else if (file.name.endsWith('.zip')) setFormat('zip');
    } catch (pickerError) {
      if ((pickerError as DOMException).name !== 'AbortError') {
        setError((pickerError as Error).message);
      }
    }
  };

  const chooseDestinationDirectory = async () => {
    if (!supportsPickers) return;
    try {
      const handle = await window.showDirectoryPicker();
      setDestination(handle);
    } catch (pickerError) {
      if ((pickerError as DOMException).name !== 'AbortError') {
        setError((pickerError as Error).message);
      }
    }
  };

  const startCreate = () => {
    if (!workerRef.current) {
      setError('Workers are not supported in this environment');
      return;
    }
    if (!entries.length) {
      setError('No files or directories selected');
      return;
    }
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    jobRef.current = { id, type: 'create', format, name: activeName };
    setError(null);
    setStatus('Creating archive...');
    setIsRunning(true);
    setProgress(0);
    setProgressBytes(null);
    setDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    workerRef.current.postMessage({
      id,
      action: 'create',
      format,
      entries,
      name: activeName,
    });
  };

  const startExtract = () => {
    if (!workerRef.current) {
      setError('Workers are not supported in this environment');
      return;
    }
    if (!archiveFile) {
      setError('Select an archive to extract');
      return;
    }
    if (!destinationRef.current) {
      setError('Choose a destination directory');
      return;
    }
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    jobRef.current = { id, type: 'extract', format, name: archiveFile.name };
    setError(null);
    setStatus('Extracting archive...');
    setIsRunning(true);
    setProgress(0);
    setProgressBytes(null);
    setDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    workerRef.current.postMessage({
      id,
      action: 'extract',
      format,
      archive: archiveFile,
    });
  };

  const progressLabel = useMemo(() => {
    if (!progressBytes) return null;
    const { processed, total } = progressBytes;
    const percent = total ? Math.min(Math.round((processed / total) * 100), 100) : 0;
    const formatBytes = (value: number) => {
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
      return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };
    return `${percent}% (${formatBytes(processed)} / ${formatBytes(total)})`;
  }, [progressBytes]);

  return (
    <div className="mt-4 border-t border-gray-700 pt-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Archive Manager</h3>
        <div className="space-x-2">
          <button
            type="button"
            className={`px-2 py-1 rounded ${mode === 'create' ? 'bg-ub-orange text-black' : 'bg-black bg-opacity-40'}`}
            onClick={() => setMode('create')}
            disabled={isRunning}
          >
            Create
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded ${mode === 'extract' ? 'bg-ub-orange text-black' : 'bg-black bg-opacity-40'}`}
            onClick={() => setMode('extract')}
            disabled={isRunning}
          >
            Extract
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-2 mb-3">
        <label className="font-semibold">Format</label>
        <select
          className="bg-black bg-opacity-30 px-1 py-0.5 rounded"
          value={format}
          onChange={(event) => setFormat(event.target.value as Format)}
          disabled={isRunning}
        >
          <option value="zip">ZIP</option>
          <option value="tar">TAR</option>
        </select>
      </div>
      {mode === 'create' ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="px-2 py-1 bg-black bg-opacity-40 rounded"
              onClick={addFiles}
              disabled={isRunning || !supportsPickers}
            >
              Add Files
            </button>
            <button
              type="button"
              className="px-2 py-1 bg-black bg-opacity-40 rounded"
              onClick={addDirectoryFromPicker}
              disabled={isRunning || !supportsPickers}
            >
              Add Directory
            </button>
            <button
              type="button"
              className="px-2 py-1 bg-black bg-opacity-40 rounded"
              onClick={useCurrentDirectory}
              disabled={isRunning || !directory}
            >
              Use Current Folder
            </button>
          </div>
          <div className="max-h-32 overflow-auto bg-black bg-opacity-20 rounded">
            {entries.length === 0 ? (
              <div className="p-2 text-gray-300">No entries selected.</div>
            ) : (
              entries.map((entry) => (
                <div key={entry.path} className="flex items-center justify-between px-2 py-1">
                  <span className="truncate" title={entry.path}>
                    {entry.directory ? '📁' : '📄'} {entry.path}
                  </span>
                  <button
                    type="button"
                    className="text-red-300 hover:text-red-200"
                    onClick={() => removeEntry(entry.path)}
                    disabled={isRunning}
                    aria-label={`Remove ${entry.path}`}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="archive-name" className="font-semibold">
              Output name
            </label>
            <input
              id="archive-name"
              className="bg-black bg-opacity-30 px-2 py-1 rounded flex-1"
              value={activeName}
              onChange={(event) => setActiveName(event.target.value)}
              disabled={isRunning}
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="px-3 py-1 bg-ub-orange text-black rounded"
              onClick={startCreate}
              disabled={isRunning || entries.length === 0}
            >
              Start
            </button>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={activeName}
                className="underline text-ub-orange"
              >
                Download archive
              </a>
            )}
            {isRunning && (
              <button type="button" className="px-2 py-1 bg-black bg-opacity-40 rounded" onClick={cancelJob}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="px-2 py-1 bg-black bg-opacity-40 rounded"
              onClick={chooseArchiveFile}
              disabled={isRunning || !supportsPickers}
            >
              Select Archive
            </button>
            {archiveFile && (
              <span className="truncate" title={archiveFile.name}>
                {archiveFile.name}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="px-2 py-1 bg-black bg-opacity-40 rounded"
              onClick={chooseDestinationDirectory}
              disabled={isRunning || !supportsPickers}
            >
              Choose Destination
            </button>
            <span className="truncate" title={destination?.name ?? 'Not selected'}>
              {destination?.name ?? 'Not selected'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="px-3 py-1 bg-ub-orange text-black rounded"
              onClick={startExtract}
              disabled={isRunning || !archiveFile || !destination}
            >
              Extract
            </button>
            {isRunning && (
              <button type="button" className="px-2 py-1 bg-black bg-opacity-40 rounded" onClick={cancelJob}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
      <div className="mt-3 space-y-1">
        <div className="h-2 bg-black bg-opacity-30 rounded">
          <div
            className="h-full bg-ub-orange rounded"
            style={{ width: `${Math.round(progress * 100)}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        {progressLabel && <div>{progressLabel}</div>}
        <div>Status: {status}</div>
        {error && <div className="text-red-300">Error: {error}</div>}
      </div>
    </div>
  );
}
