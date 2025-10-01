"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import { copyStreamWithProgress } from '../../utils/fileCopy';
import CopyStatusBar from './file-explorer/CopyStatusBar';
import Breadcrumbs from '../ui/Breadcrumbs';

export async function openFileDialog(options = {}) {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    const [handle] = await window.showOpenFilePicker(options);
    return handle;
  }

  return await new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options?.multiple) input.multiple = true;
    if (options?.types) {
      const accept = options.types
        .map((t) => t.accept && Object.values(t.accept).flat())
        .flat()
        .join(',');
      if (accept) input.accept = accept;
    }
    input.onchange = () => {
      const file = input.files[0];
      resolve(
        file && {
          name: file.name,
          getFile: async () => file,
        }
      );
    };
    input.click();
  });
}

export async function saveFileDialog(options = {}) {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    return await window.showSaveFilePicker(options);
  }

  return {
    name: options?.suggestedName || 'download',
    async createWritable() {
      return {
        async write(data) {
          const blob = data instanceof Blob ? data : new Blob([data]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = options?.suggestedName || 'download';
          a.click();
          URL.revokeObjectURL(url);
        },
        async close() {},
      };
    },
  };
}

const DB_NAME = 'file-explorer';
const STORE_NAME = 'recent';
const COPY_STORE = 'copy-jobs';

function openDB() {
  return getDb(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(COPY_STORE)) {
        db.createObjectStore(COPY_STORE);
      }
    },
  });
}

async function getRecentDirs() {
  try {
    const dbp = openDB();
    if (!dbp) return [];
    const db = await dbp;
    return (await db.getAll(STORE_NAME)) || [];
  } catch {
    return [];
  }
}

async function addRecentDir(handle) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    const entry = { name: handle.name, handle };
    await db.put(STORE_NAME, entry);
  } catch {}
}

async function persistCopyJob(job) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    await db.put(COPY_STORE, job, job.id);
  } catch {}
}

async function removeCopyJob(id) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    await db.delete(COPY_STORE, id);
  } catch {}
}

async function loadCopyJobs() {
  try {
    const dbp = openDB();
    if (!dbp) return [];
    const db = await dbp;
    return (await db.getAll(COPY_STORE)) || [];
  } catch {
    return [];
  }
}

export default function FileExplorer({ context, initialPath, path: pathProp } = {}) {
  const [supported, setSupported] = useState(true);
  const [dirHandle, setDirHandle] = useState(null);
  const [files, setFiles] = useState([]);
  const [dirs, setDirs] = useState([]);
  const [path, setPath] = useState([]);
  const [recent, setRecent] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const workerRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const [locationError, setLocationError] = useState(null);
  const [copyJob, setCopyJob] = useState(null);
  const [copyProgress, setCopyProgress] = useState(null);
  const [copySupported, setCopySupported] = useState(false);
  const abortRef = useRef(null);

  const hasWorker = typeof Worker !== 'undefined';
  const {
    supported: opfsSupported,
    root,
    getDir,
    readFile: opfsRead,
    writeFile: opfsWrite,
    deleteFile: opfsDelete,
  } = useOPFS();
  const [unsavedDir, setUnsavedDir] = useState(null);
  const scheduleFrame = useCallback((cb) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(cb);
    } else {
      setTimeout(() => cb(Date.now()), 16);
    }
  }, []);

  useEffect(() => {
    const hasDirectoryPicker = !!window.showDirectoryPicker;
    setSupported(hasDirectoryPicker);
    setCopySupported(hasDirectoryPicker);
    if (hasDirectoryPicker) getRecentDirs().then(setRecent);
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    (async () => {
      setUnsavedDir(await getDir('unsaved'));
      setDirHandle(root);
      setPath([{ name: root.name || '/', handle: root }]);
      await readDir(root);
    })();
  }, [opfsSupported, root, getDir, readDir]);

  useEffect(() => {
    let active = true;
    loadCopyJobs().then((jobs) => {
      if (!active || jobs.length === 0) return;
      runCopyJob(jobs[0]);
    });
    return () => {
      active = false;
    };
  }, [runCopyJob]);

  const saveBuffer = async (name, data) => {
    if (unsavedDir) await opfsWrite(name, data, unsavedDir);
  };

  const loadBuffer = async (name) => {
    if (!unsavedDir) return null;
    return await opfsRead(name, unsavedDir);
  };

  const removeBuffer = async (name) => {
    if (unsavedDir) await opfsDelete(name, unsavedDir);
  };

  const runCopyJob = useCallback(
    async (job) => {
      if (!job || !job.sourceHandle || !job.destDirHandle) {
        if (job?.id) await removeCopyJob(job.id);
        setCopyJob(null);
        setCopyProgress(null);
        return;
      }

      const ensurePermission = async (handle, mode) => {
        if (!handle?.queryPermission) return 'granted';
        try {
          const current = await handle.queryPermission({ mode });
          if (current === 'granted') return 'granted';
          if (!handle.requestPermission) return current;
          return await handle.requestPermission({ mode });
        } catch {
          return 'denied';
        }
      };

      const destName = job.destName || job.fileName || job.name || 'copy';
      const controller = new AbortController();
      abortRef.current = controller;
      let writable;
      try {
        const [readPerm, writePerm] = await Promise.all([
          ensurePermission(job.sourceHandle, 'read'),
          ensurePermission(job.destDirHandle, 'readwrite'),
        ]);
        if (readPerm !== 'granted' || writePerm !== 'granted') {
          throw new Error('permission-denied');
        }

        const sourceFile = await job.sourceHandle.getFile();
        const totalBytes = sourceFile.size ?? job.totalBytes ?? 0;
        const startOffset = Math.min(job.bytesProcessed || 0, totalBytes);
        const startedAt = job.startedAt || Date.now();
        const baseJob = {
          ...job,
          destName,
          totalBytes,
          bytesProcessed: startOffset,
          startedAt,
          updatedAt: Date.now(),
        };

        setCopyJob(baseJob);
        setCopyProgress({
          jobId: baseJob.id,
          bytesProcessed: startOffset,
          totalBytes,
          throughput: 0,
          etaMs: null,
          startedAt,
          updatedAt: Date.now(),
        });
        await persistCopyJob(baseJob);

        const sourceStream =
          startOffset > 0
            ? sourceFile.slice(startOffset).stream()
            : sourceFile.stream();
        const reader = sourceStream.getReader();
        const iterable = {
          async *[Symbol.asyncIterator]() {
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) yield value;
              }
            } finally {
              reader.releaseLock();
            }
          },
        };

        if (startOffset === 0) {
          try {
            await job.destDirHandle.removeEntry(destName);
          } catch {}
        }

        const destHandle = await job.destDirHandle.getFileHandle(destName, {
          create: true,
        });
        writable = await destHandle.createWritable({
          keepExistingData: startOffset > 0,
        });
        let writeOffset = startOffset;

        await copyStreamWithProgress(
          iterable,
          {
            write: async (chunk) => {
              await writable.write({
                type: 'write',
                position: writeOffset,
                data: chunk,
              });
              writeOffset += chunk.byteLength;
            },
            close: () => writable.close(),
            abort: () =>
              typeof writable.abort === 'function'
                ? writable.abort()
                : writable.close(),
          },
          {
            jobId: baseJob.id,
            totalBytes,
            signal: controller.signal,
            schedule: scheduleFrame,
            startTime: startedAt,
            resumeFromBytes: startOffset,
            onProgress: (progress) => {
              setCopyProgress(progress);
              setCopyJob((prev) =>
                prev && prev.id === baseJob.id
                  ? {
                      ...prev,
                      bytesProcessed: progress.bytesProcessed,
                      totalBytes: progress.totalBytes,
                      updatedAt: progress.updatedAt,
                    }
                  : prev,
              );
            },
            onPersist: async (state) => {
              await persistCopyJob({
                ...baseJob,
                bytesProcessed: state.bytesProcessed,
                totalBytes: state.totalBytes,
                updatedAt: state.updatedAt,
              });
            },
          },
        );

        await removeCopyJob(baseJob.id);
        setCopyJob(null);
        setCopyProgress(null);
        abortRef.current = null;
      } catch (err) {
        if (!controller.signal.aborted) {
          setLocationError('Copy failed');
        }
        try {
          await writable?.abort?.();
        } catch {}
        try {
          if (job.destDirHandle?.removeEntry) {
            await job.destDirHandle.removeEntry(destName);
          }
        } catch {}
        await removeCopyJob(job.id);
        setCopyJob(null);
        setCopyProgress(null);
        abortRef.current = null;
      }
    },
    [scheduleFrame],
  );

  const openFallback = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setCurrentFile({ name: file.name });
    setContent(text);
  };

  const copyCurrentFile = useCallback(async () => {
    if (!currentFile?.handle || copyJob) return;
    if (!window.showDirectoryPicker) {
      setLocationError('Copy requires File System Access support.');
      return;
    }
    try {
      const destDir = await window.showDirectoryPicker();
      if (!destDir) return;
      const sourceFile = await currentFile.handle.getFile();
      const totalBytes = sourceFile.size ?? 0;
      const startedAt = Date.now();
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `copy-${Date.now()}`;
      const job = {
        id,
        fileName: currentFile.name,
        destName: currentFile.name,
        sourceHandle: currentFile.handle,
        destDirHandle: destDir,
        totalBytes,
        bytesProcessed: 0,
        startedAt,
        updatedAt: startedAt,
      };
      setCopyJob(job);
      setCopyProgress({
        jobId: id,
        bytesProcessed: 0,
        totalBytes,
        throughput: 0,
        etaMs: null,
        startedAt,
        updatedAt: startedAt,
      });
      await persistCopyJob(job);
      await runCopyJob(job);
    } catch {
      setLocationError('Unable to start copy');
      setCopyJob(null);
      setCopyProgress(null);
    }
  }, [copyJob, currentFile, runCopyJob]);

  const cancelCopy = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const openFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirHandle(handle);
      addRecentDir(handle);
      setRecent(await getRecentDirs());
      setPath([{ name: handle.name || '/', handle }]);
      await readDir(handle);
      setLocationError(null);
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      setDirHandle(entry.handle);
      setPath([{ name: entry.name, handle: entry.handle }]);
      await readDir(entry.handle);
      setLocationError(null);
    } catch {}
  };

  const openFile = async (file) => {
    setCurrentFile(file);
    let text = '';
    if (opfsSupported) {
      const unsaved = await loadBuffer(file.name);
      if (unsaved !== null) text = unsaved;
    }
    if (!text) {
      const f = await file.handle.getFile();
      text = await f.text();
    }
    setContent(text);
  };

  const readDir = useCallback(async (handle) => {
    const ds = [];
    const fs = [];
    for await (const [name, h] of handle.entries()) {
      if (h.kind === 'file') fs.push({ name, handle: h });
      else if (h.kind === 'directory') ds.push({ name, handle: h });
    }
    setDirs(ds);
    setFiles(fs);
  }, []);

  useEffect(() => {
    const requested =
      (context?.initialPath ?? context?.path ?? initialPath ?? pathProp) || '';
    if (!requested) return;
    if (!opfsSupported || !root) return;
    let active = true;
    const openPath = async () => {
      const sanitized = requested
        .replace(/^~\//, 'home/kali/')
        .replace(/^\/+/, '');
      try {
        if (!sanitized) {
          if (!active) return;
          setDirHandle(root);
          setPath([{ name: root.name || '/', handle: root }]);
          await readDir(root);
          if (active) setLocationError(null);
          return;
        }
        let current = root;
        const crumbs = [{ name: root.name || '/', handle: root }];
        const segments = sanitized
          .split('/')
          .map((segment) => segment.trim())
          .filter(Boolean);
        for (const segment of segments) {
          current = await current.getDirectoryHandle(segment, { create: true });
          crumbs.push({ name: segment, handle: current });
        }
        if (!active) return;
        setDirHandle(current);
        setPath(crumbs);
        await readDir(current);
        if (active) setLocationError(null);
      } catch {
        if (active) setLocationError(`Unable to open ${requested}`);
      }
    };
    setLocationError(null);
    openPath();
    return () => {
      active = false;
    };
  }, [context, initialPath, pathProp, opfsSupported, root, readDir]);

  const openDir = async (dir) => {
    setDirHandle(dir.handle);
    setPath((p) => [...p, { name: dir.name, handle: dir.handle }]);
    await readDir(dir.handle);
    setLocationError(null);
  };

  const navigateTo = async (index) => {
    const target = path[index];
    if (!target || !target.handle) return;
    setDirHandle(target.handle);
    setPath(path.slice(0, index + 1));
    await readDir(target.handle);
    setLocationError(null);
  };

  const goBack = async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setPath(newPath);
    if (prev?.handle) {
      setDirHandle(prev.handle);
      await readDir(prev.handle);
      setLocationError(null);
    }
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile.name);
    } catch {}
  };

  const onChange = (e) => {
    const text = e.target.value;
    setContent(text);
    if (opfsSupported && currentFile) saveBuffer(currentFile.name, text);
  };

  const runSearch = () => {
    if (!dirHandle || !hasWorker) return;
    setResults([]);
    if (workerRef.current) workerRef.current.terminate();
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./find.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const { file, line, text, done } = e.data;
        if (done) {
          workerRef.current?.terminate();
          workerRef.current = null;
        } else {
          setResults((r) => [...r, { file, line, text }]);
        }
      };
      workerRef.current.postMessage({ directoryHandle: dirHandle, query });
    }
  };

  useEffect(() => () => workerRef.current?.terminate(), []);

  if (!supported) {
    return (
        <div className="p-4 flex flex-col h-full">
          <input
            ref={fallbackInputRef}
            type="file"
            onChange={openFallback}
            className="hidden"
            aria-label="Open file"
          />
        {!currentFile && (
          <button
            onClick={() => fallbackInputRef.current?.click()}
            className="px-2 py-1 bg-black bg-opacity-50 rounded self-start"
          >
            Open File
          </button>
        )}
        {currentFile && (
          <>
              <textarea
                className="flex-1 mt-2 p-2 bg-ub-cool-grey outline-none"
                value={content}
                onChange={onChange}
                aria-label="File contents"
              />
            <button
              onClick={async () => {
                const handle = await saveFileDialog({ suggestedName: currentFile.name });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
              }}
              className="mt-2 px-2 py-1 bg-black bg-opacity-50 rounded self-start"
            >
              Save
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm">
      <div className="flex items-center space-x-2 p-2 bg-ub-warm-grey bg-opacity-40">
        <button onClick={openFolder} className="px-2 py-1 bg-black bg-opacity-50 rounded">
          Open Folder
        </button>
        {path.length > 1 && (
          <button onClick={goBack} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Back
          </button>
        )}
        <Breadcrumbs path={path} onNavigate={navigateTo} />
        {locationError && (
          <div className="text-xs text-red-300" role="status">
            {locationError}
          </div>
        )}
        {currentFile && (
          <>
            <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
              Save
            </button>
            {copySupported && (
              <button
                onClick={copyCurrentFile}
                className="px-2 py-1 bg-black bg-opacity-50 rounded"
              >
                Copy To…
              </button>
            )}
          </>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-40 overflow-auto border-r border-gray-600">
          <div className="p-2 font-bold">Recent</div>
          {recent.map((r, i) => (
            <div
              key={i}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openRecent(r)}
            >
              {r.name}
            </div>
          ))}
          <div className="p-2 font-bold">Directories</div>
          {dirs.map((d, i) => (
            <div
              key={i}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openDir(d)}
            >
              {d.name}
            </div>
          ))}
          <div className="p-2 font-bold">Files</div>
          {files.map((f, i) => (
            <div
              key={i}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openFile(f)}
            >
              {f.name}
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
            {currentFile && (
              <textarea
                className="flex-1 p-2 bg-ub-cool-grey outline-none"
                value={content}
                onChange={onChange}
                aria-label="File contents"
              />
            )}
            <div className="p-2 border-t border-gray-600">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find in files"
                className="px-1 py-0.5 text-black"
                aria-label="Search files"
              />
            <button onClick={runSearch} className="ml-2 px-2 py-1 bg-black bg-opacity-50 rounded">
              Search
            </button>
            <div className="max-h-40 overflow-auto mt-2">
              {results.map((r, i) => (
                <div key={i}>
                  <span className="font-bold">{r.file}:{r.line}</span> {r.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {copyJob && copyProgress && (
        <CopyStatusBar
          jobName={`Copying ${copyJob.destName || copyJob.fileName || copyJob.name}`}
          progress={copyProgress}
          onCancel={cancelCopy}
        />
      )}
    </div>
  );
}
