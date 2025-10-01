"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import { formatBytes } from './converter/format';
import {
  loadBinEntries,
  persistSoftDelete,
  restoreEntry,
  removeEntry,
  emptyBin,
  purgeExpiredEntries,
  BIN_STORE,
} from './file-explorer/recycleBin';

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
const BIN_RETENTION_KEY = 'trash-purge-days';
const DEFAULT_RETENTION_DAYS = 30;

function openDB() {
  return getDb(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1 && !db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(BIN_STORE)) {
        db.createObjectStore(BIN_STORE, { keyPath: 'id' });
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
  const [recycleDir, setRecycleDir] = useState(null);
  const [binItems, setBinItems] = useState([]);
  const [showBin, setShowBin] = useState(false);
  const undoTimeoutRef = useRef(null);
  const [undoEntry, setUndoEntry] = useState(null);

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
  const dbPromiseRef = useRef(null);

  if (!dbPromiseRef.current) {
    dbPromiseRef.current = openDB();
  }

  const dbPromise = dbPromiseRef.current;

  const binSummary = useMemo(() => {
    const count = binItems.length;
    const totalSize = binItems.reduce((sum, item) => sum + (item.size || 0), 0);
    return { count, totalSize };
  }, [binItems]);

  useEffect(() => {
    const ok = !!window.showDirectoryPicker;
    setSupported(ok);
    if (ok) getRecentDirs().then(setRecent);
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    (async () => {
      setUnsavedDir(await getDir('unsaved'));
      setDirHandle(root);
      setPath([{ name: root.name || '/', handle: root }]);
      await readDir(root);
      setRecycleDir(await getDir('recycle-bin'));
    })();
  }, [opfsSupported, root, getDir, readDir]);

  useEffect(() => {
    let cancelled = false;
    if (!dbPromise) return;
    (async () => {
      const entries = await loadBinEntries(dbPromise);
      if (!cancelled) setBinItems(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [dbPromise]);

  const purgeBin = useCallback(async () => {
    if (!dbPromise) return;
    const retentionDays = parseInt(
      (typeof window !== 'undefined' && window.localStorage?.getItem(BIN_RETENTION_KEY)) ||
        `${DEFAULT_RETENTION_DAYS}`,
      10,
    );
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const { remaining } = await purgeExpiredEntries({
      recycleDir,
      dbPromise,
      retentionMs,
    });
    setBinItems(remaining);
    if (undoEntry && !remaining.some((item) => item.id === undoEntry.id)) {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
      setUndoEntry(null);
    }
  }, [dbPromise, recycleDir, undoEntry]);

  useEffect(() => {
    if (!dbPromise) return;
    purgeBin();
    const interval = setInterval(purgeBin, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dbPromise, purgeBin]);

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

  const refreshBin = useCallback(async () => {
    if (!dbPromise) return;
    const entries = await loadBinEntries(dbPromise);
    setBinItems(entries);
  }, [dbPromise]);

  const openFallback = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setCurrentFile({ name: file.name });
    setContent(text);
  };

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

  const handleSoftDelete = async (file) => {
    if (!dirHandle || !recycleDir) return;
    if (!dbPromise) {
      setLocationError('Recycle bin storage is unavailable.');
      return;
    }
    try {
      if (dirHandle.requestPermission) {
        const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          setLocationError('Permission denied for deleting files.');
          return;
        }
      }
      const entry = await persistSoftDelete({
        fileEntry: file,
        directoryHandle: dirHandle,
        recycleDir,
        dbPromise,
        pathSegments: path.map((p) => (p.name === '/' ? '' : p.name)),
      });
      setFiles((prev) => prev.filter((f) => f.name !== file.name));
      setBinItems((prev) => [entry, ...prev]);
      if (currentFile?.name === file.name) {
        setCurrentFile(null);
        setContent('');
      }
      if (opfsSupported) await removeBuffer(file.name);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      setUndoEntry(entry);
      undoTimeoutRef.current = setTimeout(() => {
        setUndoEntry(null);
        undoTimeoutRef.current = null;
      }, 10000);
    } catch (err) {
      setLocationError(`Unable to delete ${file.name}`);
      await refreshBin();
    }
  };

  const handleRestore = async (entry) => {
    if (!entry || !dbPromise) return;
    try {
      await restoreEntry(entry, { recycleDir, dbPromise });
      if (undoEntry?.id === entry.id) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
        setUndoEntry(null);
      }
      setBinItems((prev) => prev.filter((item) => item.id !== entry.id));
      if (dirHandle && entry.directoryHandle === dirHandle) {
        await readDir(dirHandle);
      }
    } catch (err) {
      setLocationError(`Unable to restore ${entry.name}`);
      await refreshBin();
    }
  };

  const handlePermanentDelete = async (entry) => {
    if (!entry || !dbPromise) return;
    try {
      await removeEntry(entry, { recycleDir, dbPromise });
      setBinItems((prev) => prev.filter((item) => item.id !== entry.id));
      if (undoEntry?.id === entry.id && undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
        setUndoEntry(null);
      }
    } catch {
      setLocationError(`Unable to remove ${entry.name} permanently`);
      await refreshBin();
    }
  };

  const handleEmptyBin = async () => {
    if (!binItems.length) return;
    if (typeof window !== 'undefined' && !window.confirm('Permanently delete all items in the recycle bin?')) {
      return;
    }
    if (!dbPromise) return;
    try {
      await emptyBin({ recycleDir, dbPromise });
      setBinItems([]);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
      setUndoEntry(null);
    } catch {
      setLocationError('Unable to empty recycle bin');
      await refreshBin();
    }
  };

  const undoDelete = async () => {
    if (!undoEntry || !dbPromise) return;
    try {
      await restoreEntry(undoEntry, { recycleDir, dbPromise });
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
      setUndoEntry(null);
      setBinItems((prev) => prev.filter((item) => item.id !== undoEntry.id));
      if (dirHandle && undoEntry.directoryHandle === dirHandle) {
        await readDir(dirHandle);
      }
    } catch {
      setLocationError(`Unable to undo delete for ${undoEntry.name}`);
      await refreshBin();
    }
  };

  useEffect(
    () => () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    },
    [],
  );

  useEffect(() => () => workerRef.current?.terminate(), []);

  if (!supported) {
    return (
      <div className="p-4 flex flex-col h-full">
        <input
          ref={fallbackInputRef}
          type="file"
          onChange={openFallback}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
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
        <button
          onClick={() => setShowBin((prev) => !prev)}
          className="px-2 py-1 bg-black bg-opacity-50 rounded"
        >
          {showBin ? 'Close Bin' : `Recycle Bin (${binSummary.count})`}
        </button>
        {locationError && (
          <div className="text-xs text-red-300" role="status">
            {locationError}
          </div>
        )}
        {currentFile && (
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        {!showBin && (
          <>
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
                  className="px-2 py-1 flex items-center justify-between hover:bg-black hover:bg-opacity-30"
                >
                  <span className="flex-1 cursor-pointer" onClick={() => openFile(f)}>
                    {f.name}
                  </span>
                  <button
                    onClick={() => handleSoftDelete(f)}
                    className="ml-2 px-1 py-0.5 text-xs bg-red-600 bg-opacity-70 rounded"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div className="flex-1 flex flex-col">
              {currentFile && (
                <textarea
                  className="flex-1 p-2 bg-ub-cool-grey outline-none"
                  value={content}
                  onChange={onChange}
                  aria-label="Editor contents"
                />
              )}
              <div className="p-2 border-t border-gray-600">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find in files"
                  className="px-1 py-0.5 text-black"
                  aria-label="Search within files"
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
          </>
        )}
        {showBin && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-gray-600 flex items-center justify-between">
              <div>
                <div className="font-semibold">Recycle Bin</div>
                <div className="text-xs text-gray-300">
                  {binSummary.count} item{binSummary.count === 1 ? '' : 's'} · {formatBytes(binSummary.totalSize || 0)}
                </div>
              </div>
              <button
                onClick={handleEmptyBin}
                className="px-2 py-1 bg-black bg-opacity-50 rounded disabled:opacity-50"
                disabled={!binItems.length}
              >
                Empty Bin
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {!binItems.length && (
                <div className="text-center text-gray-300">No items in recycle bin.</div>
              )}
              {binItems.map((item) => (
                <div key={item.id} className="bg-black bg-opacity-40 p-2 rounded flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-gray-300">
                      {item.originalPath || item.name} · Deleted {new Date(item.deletedAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">{formatBytes(item.size || 0)}</div>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleRestore(item)}
                      className="px-2 py-1 bg-green-600 bg-opacity-70 rounded"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item)}
                      className="px-2 py-1 bg-red-600 bg-opacity-70 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {undoEntry && (
        <div className="p-2 bg-black bg-opacity-60 flex items-center justify-between text-xs">
          <span>
            {undoEntry.name} moved to recycle bin. Undo available for 10 seconds.
          </span>
          <button onClick={undoDelete} className="px-2 py-1 bg-green-600 bg-opacity-70 rounded">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
