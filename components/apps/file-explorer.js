"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import { RecycleBinUndoManager, restoreDeletion } from '../../modules/fileExplorer/undoManager';

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

function openDB() {
  return getDb(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { autoIncrement: true });
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

const makeFileKey = (groupId, file) => `${groupId}:${file.path}`;

const formatBytes = (value) => {
  const size = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  if (size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let display = size;
  while (display >= 1024 && unitIndex < units.length - 1) {
    display /= 1024;
    unitIndex += 1;
  }
  const precision = display >= 10 || unitIndex === 0 ? 0 : 1;
  return `${display.toFixed(precision)} ${units[unitIndex]}`;
};

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
  const [scanState, setScanState] = useState({ status: 'idle', progress: 0, message: null, processed: 0, total: 0 });
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [selection, setSelection] = useState({});
  const [undoPrompt, setUndoPrompt] = useState(null);
  const [actionError, setActionError] = useState(null);
  const scanWorkerRef = useRef(null);
  const scanRootRef = useRef(null);
  const recycleDirRef = useRef(null);
  const undoManagerRef = useRef(new RecycleBinUndoManager());
  const shellRef = useRef(context?.shell);

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

  useEffect(() => {
    shellRef.current = context?.shell;
  }, [context]);

  useEffect(
    () => () => {
      shellRef.current?.clearBadge?.();
      if (scanWorkerRef.current) {
        scanWorkerRef.current.terminate();
        scanWorkerRef.current = null;
      }
    },
    []
  );

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
    })();
  }, [opfsSupported, root, getDir]);

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

  const resetScanner = useCallback(() => {
    setScanState({ status: 'idle', progress: 0, message: null, processed: 0, total: 0 });
    setDuplicateGroups([]);
    setSelection({});
    setUndoPrompt(null);
    setActionError(null);
    undoManagerRef.current.clear();
    scanRootRef.current = null;
    recycleDirRef.current = null;
    if (scanWorkerRef.current) {
      scanWorkerRef.current.terminate();
      scanWorkerRef.current = null;
    }
    shellRef.current?.clearBadge?.();
  }, []);

  const resolveDirectory = useCallback(async (segments = [], options = { create: false }) => {
    let current = scanRootRef.current;
    if (!current) throw new Error('No directory selected');
    for (let i = 0; i < segments.length; i += 1) {
      current = await current.getDirectoryHandle(segments[i], options);
    }
    return current;
  }, []);

  const ensureRecycleDir = useCallback(async () => {
    if (recycleDirRef.current) return recycleDirRef.current;
    const rootHandle = scanRootRef.current;
    if (!rootHandle || typeof rootHandle.getDirectoryHandle !== 'function') return null;
    try {
      recycleDirRef.current = await rootHandle.getDirectoryHandle('.recycle-bin', { create: true });
      return recycleDirRef.current;
    } catch (error) {
      return null;
    }
  }, []);

  const restoreFileEntry = useCallback(
    async (entry) => {
      if (!entry) return;
      const parentSegments = Array.isArray(entry.segments) ? entry.segments.slice(0, -1) : [];
      const parent = await resolveDirectory(parentSegments, { create: true });
      const fileHandle = await parent.getFileHandle(entry.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(entry.data);
      await writable.close();
      if (recycleDirRef.current && entry.recycleName) {
        try {
          await recycleDirRef.current.removeEntry(entry.recycleName);
        } catch {}
      }
    },
    [resolveDirectory]
  );

  const moveFileToRecycleBin = useCallback(
    async (groupId, file) => {
      const segments = Array.isArray(file?.segments) ? file.segments : [];
      const parentSegments = segments.slice(0, -1);
      const parent = await resolveDirectory(parentSegments);
      const fileHandle = await parent.getFileHandle(file.name);
      const fileBlob = await fileHandle.getFile();
      const buffer = await fileBlob.arrayBuffer();
      const recycleDir = await ensureRecycleDir();
      let recycleName = null;
      if (recycleDir) {
        recycleName = `${file.name}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const recycleHandle = await recycleDir.getFileHandle(recycleName, { create: true });
        const writable = await recycleHandle.createWritable();
        await writable.write(buffer);
        await writable.close();
      }
      await parent.removeEntry(file.name);
      return {
        groupId,
        segments: [...segments],
        name: file.name,
        path: file.path,
        type: fileBlob.type,
        data: buffer,
        recycleName,
        fileInfo: { ...file },
      };
    },
    [ensureRecycleDir, resolveDirectory]
  );

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
      resetScanner();
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
      resetScanner();
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
          resetScanner();
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
        resetScanner();
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
    resetScanner();
    setPath((p) => [...p, { name: dir.name, handle: dir.handle }]);
    await readDir(dir.handle);
    setLocationError(null);
  };

  const navigateTo = async (index) => {
    const target = path[index];
    if (!target || !target.handle) return;
    setDirHandle(target.handle);
    resetScanner();
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
      resetScanner();
      await readDir(prev.handle);
      setLocationError(null);
    }
  };

  const startScan = useCallback(async () => {
    if (!dirHandle) return;
    if (!hasWorker || typeof Worker !== 'function') {
      setScanState({ status: 'error', progress: 0, message: 'Background workers are not supported in this browser.', processed: 0, total: 0 });
      return;
    }
    try {
      if (typeof dirHandle.requestPermission === 'function') {
        const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (permission && permission !== 'granted') {
          setScanState({ status: 'error', progress: 0, message: 'Permission to modify files was denied.', processed: 0, total: 0 });
          return;
        }
      }
    } catch (error) {
      setScanState({ status: 'error', progress: 0, message: error?.message || 'Unable to request permissions.', processed: 0, total: 0 });
      return;
    }

    if (scanWorkerRef.current) {
      scanWorkerRef.current.terminate();
      scanWorkerRef.current = null;
    }

    const worker = new Worker(new URL('./file-explorer.hash.worker.js', import.meta.url));
    scanWorkerRef.current = worker;
    scanRootRef.current = dirHandle;
    recycleDirRef.current = null;
    undoManagerRef.current.clear();
    setDuplicateGroups([]);
    setSelection({});
    setUndoPrompt(null);
    setActionError(null);
    setScanState({ status: 'scanning', progress: 0, message: null, processed: 0, total: 0 });

    worker.onmessage = (event) => {
      const { type } = event.data || {};
      if (type === 'progress') {
        const processed = Number(event.data.processed) || 0;
        const total = Number(event.data.total) || 0;
        const progress = total > 0 ? processed / total : 0;
        setScanState({ status: 'scanning', progress, message: null, processed, total });
        shellRef.current?.setBadge?.({ progress, text: `${Math.round(progress * 100)}%` });
      } else if (type === 'complete') {
        worker.terminate();
        scanWorkerRef.current = null;
        shellRef.current?.clearBadge?.();
        setScanState((prev) => ({ ...prev, status: 'completed', progress: 1, message: null, processed: prev.total || prev.processed, total: prev.total || prev.processed }));
        const groups = Array.isArray(event.data.groups) ? event.data.groups : [];
        groups.sort((a, b) => (b.files?.length || 0) - (a.files?.length || 0) || (b.size || 0) - (a.size || 0));
        setDuplicateGroups(groups);
        setSelection(() => {
          const defaults = {};
          groups.forEach((group) => {
            (group.files || []).forEach((file, index) => {
              defaults[makeFileKey(group.id, file)] = index > 0;
            });
          });
          return defaults;
        });
      } else if (type === 'cancelled') {
        worker.terminate();
        scanWorkerRef.current = null;
        shellRef.current?.clearBadge?.();
        setScanState({ status: 'cancelled', progress: 0, message: null, processed: 0, total: 0 });
      } else if (type === 'error') {
        worker.terminate();
        scanWorkerRef.current = null;
        shellRef.current?.clearBadge?.();
        setScanState({ status: 'error', progress: 0, message: event.data.message || 'Scan failed.', processed: 0, total: 0 });
      }
    };

    worker.postMessage({ type: 'start', directoryHandle: dirHandle });
  }, [dirHandle, hasWorker]);

  const cancelScan = useCallback(() => {
    if (!scanWorkerRef.current) return;
    scanWorkerRef.current.postMessage({ type: 'cancel' });
    setScanState((prev) => ({ ...prev, status: 'cancelling' }));
  }, []);

  const toggleSelection = useCallback((groupId, file) => {
    const key = makeFileKey(groupId, file);
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSelectAll = useCallback(
    (groupId, value) => {
      setSelection((prev) => {
        const next = { ...prev };
        const group = duplicateGroups.find((g) => g.id === groupId);
        if (!group) return prev;
        group.files.forEach((file, index) => {
          next[makeFileKey(groupId, file)] = typeof value === 'boolean' ? value : index > 0;
        });
        return next;
      });
    },
    [duplicateGroups]
  );

  const handleDeleteSelected = useCallback(
    async (group) => {
      if (!group || !dirHandle) return;
      const selectedFiles = (group.files || []).filter((file) => selection[makeFileKey(group.id, file)]);
      if (selectedFiles.length === 0) return;
      const targetKeys = new Set(selectedFiles.map((file) => makeFileKey(group.id, file)));
      const deletedEntries = [];
      setActionError(null);
      try {
        for (let i = 0; i < selectedFiles.length; i += 1) {
          const entry = await moveFileToRecycleBin(group.id, selectedFiles[i]);
          deletedEntries.push(entry);
        }
      } catch (error) {
        setActionError(error?.message || 'Unable to move files to recycle bin.');
        if (deletedEntries.length > 0) {
          await restoreDeletion({ files: deletedEntries }, restoreFileEntry);
        }
        return;
      }

      const snapshot = {
        ...group,
        files: (group.files || []).map((file) => ({ ...file })),
      };
      undoManagerRef.current.push({ files: deletedEntries, groupSnapshot: snapshot });
      setUndoPrompt({
        count: deletedEntries.length,
        groupId: group.id,
        message: `${deletedEntries.length} file${deletedEntries.length === 1 ? '' : 's'} moved to recycle bin.`,
      });

      setSelection((prev) => {
        const next = { ...prev };
        targetKeys.forEach((key) => {
          delete next[key];
        });
        return next;
      });

      setDuplicateGroups((prev) => {
        const next = prev
          .map((item) => {
            if (item.id !== group.id) return item;
            const remaining = (item.files || []).filter((file) => !targetKeys.has(makeFileKey(group.id, file)));
            return { ...item, files: remaining };
          })
          .filter((item) => (item.files?.length || 0) > 1);
        next.sort((a, b) => (b.files?.length || 0) - (a.files?.length || 0) || (b.size || 0) - (a.size || 0));
        return next;
      });

      await readDir(dirHandle);
    },
    [dirHandle, moveFileToRecycleBin, readDir, restoreFileEntry, selection]
  );

  const applySnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    const sanitized = {
      ...snapshot,
      files: Array.isArray(snapshot.files) ? snapshot.files.map((file) => ({ ...file })) : [],
    };
    setDuplicateGroups((prev) => {
      const next = prev.filter((group) => group.id !== sanitized.id);
      if (sanitized.files.length > 1) {
        next.push(sanitized);
      }
      next.sort((a, b) => (b.files?.length || 0) - (a.files?.length || 0) || (b.size || 0) - (a.size || 0));
      return next;
    });
    setSelection((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${sanitized.id}:`)) delete next[key];
      });
      sanitized.files.forEach((file, index) => {
        next[makeFileKey(sanitized.id, file)] = index > 0;
      });
      return next;
    });
  }, []);

  const handleUndo = useCallback(async () => {
    const operation = undoManagerRef.current.pop();
    if (!operation) return;
    await restoreDeletion(operation, restoreFileEntry);
    applySnapshot(operation.groupSnapshot);
    setUndoPrompt(null);
    setActionError(null);
    if (dirHandle) await readDir(dirHandle);
  }, [applySnapshot, dirHandle, readDir, restoreFileEntry]);

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
        <input ref={fallbackInputRef} type="file" onChange={openFallback} className="hidden" />
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
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
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
            <textarea className="flex-1 p-2 bg-ub-cool-grey outline-none" value={content} onChange={onChange} />
          )}
          <div className="p-2 border-t border-gray-600 space-y-4">
            <div>
              <div className="flex items-center">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find in files"
                  className="px-1 py-0.5 text-black flex-1"
                />
                <button onClick={runSearch} className="ml-2 px-2 py-1 bg-black bg-opacity-50 rounded">
                  Search
                </button>
              </div>
              <div className="max-h-40 overflow-auto mt-2">
                {results.map((r, i) => (
                  <div key={i}>
                    <span className="font-bold">{r.file}:{r.line}</span> {r.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Duplicate Scanner</div>
                  <div className="text-xs text-gray-300">
                    Identify duplicate files by content hash and manage safe deletions.
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {(scanState.status === 'scanning' || scanState.status === 'cancelling') && (
                    <button onClick={cancelScan} className="px-2 py-1 bg-black bg-opacity-50 rounded">
                      Cancel
                    </button>
                  )}
                  {scanState.status !== 'scanning' && scanState.status !== 'cancelling' && (
                    <button
                      onClick={startScan}
                      className="px-2 py-1 bg-black bg-opacity-50 rounded"
                      disabled={!dirHandle || !hasWorker}
                    >
                      Scan
                    </button>
                  )}
                </div>
              </div>
              {(scanState.status === 'scanning' || scanState.status === 'cancelling') && (
                <div className="flex items-center space-x-2" role="status">
                  <progress className="flex-1" value={scanState.progress} max={1} />
                  <span className="text-xs">{`${Math.round((scanState.progress || 0) * 100)}%`}</span>
                </div>
              )}
              {scanState.status === 'error' && scanState.message && (
                <div className="text-xs text-red-400">{scanState.message}</div>
              )}
              {scanState.status === 'cancelled' && (
                <div className="text-xs text-yellow-300">Scan cancelled.</div>
              )}
              {duplicateGroups.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-auto pr-1">
                  {duplicateGroups.map((group) => {
                    const selectedFiles = (group.files || []).filter((file) => selection[makeFileKey(group.id, file)]);
                    return (
                      <div key={group.id} className="border border-gray-700 rounded p-2 bg-black bg-opacity-20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">
                              Hash {group.hash.slice(0, 8)} · {group.files.length} file{group.files.length === 1 ? '' : 's'}
                            </div>
                            <div className="text-xs text-gray-300">Size: {formatBytes(group.size)}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSelectAll(group.id, true)}
                              className="px-2 py-1 bg-black bg-opacity-50 rounded"
                            >
                              Select all
                            </button>
                            <button
                              onClick={() => handleSelectAll(group.id, false)}
                              className="px-2 py-1 bg-black bg-opacity-50 rounded"
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => handleDeleteSelected(group)}
                              disabled={selectedFiles.length === 0}
                              className="px-2 py-1 bg-ub-orange bg-opacity-80 text-black rounded disabled:opacity-40"
                            >
                              Delete selected
                            </button>
                          </div>
                        </div>
                        <ul className="mt-2 space-y-1 text-xs">
                          {(group.files || []).map((file, index) => {
                            const key = makeFileKey(group.id, file);
                            return (
                              <li key={key} className="flex items-center">
                                <input
                                  type="checkbox"
                                  className="mr-2"
                                  checked={Boolean(selection[key])}
                                  onChange={() => toggleSelection(group.id, file)}
                                />
                                <span className="truncate" title={file.path}>
                                  {index === 0 ? 'Keep' : 'Duplicate'} · {file.path}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                scanState.status === 'completed' && (
                  <div className="text-xs text-gray-300">No duplicate files detected.</div>
                )
              )}
              {actionError && <div className="text-xs text-red-400">{actionError}</div>}
              {undoPrompt && (
                <div className="flex items-center justify-between bg-black bg-opacity-30 border border-gray-700 rounded px-2 py-2 text-xs">
                  <span>{undoPrompt.message}</span>
                  <button onClick={handleUndo} className="px-2 py-1 bg-black bg-opacity-50 rounded">
                    Undo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
