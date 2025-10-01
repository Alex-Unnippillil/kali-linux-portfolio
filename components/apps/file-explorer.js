"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import BulkRename from './file-explorer/BulkRename';

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
  const [selectedNames, setSelectedNames] = useState([]);
  const [bulkRenameOpen, setBulkRenameOpen] = useState(false);
  const [renameHistory, setRenameHistory] = useState({ past: [], future: [] });

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
  const selectedItems = useMemo(() => {
    const lookup = new Map(files.map((file) => [file.name, file]));
    return selectedNames.map((name) => lookup.get(name)).filter(Boolean);
  }, [files, selectedNames]);

  useEffect(() => {
    setSelectedNames((prev) => prev.filter((name) => files.some((file) => file.name === name)));
  }, [files]);

  useEffect(() => {
    if (bulkRenameOpen && selectedItems.length === 0) {
      setBulkRenameOpen(false);
    }
  }, [bulkRenameOpen, selectedItems.length]);

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
  }, [opfsSupported, root, getDir, readDir]);

  const saveBuffer = useCallback(
    async (name, data) => {
      if (unsavedDir) await opfsWrite(name, data, unsavedDir);
    },
    [unsavedDir, opfsWrite],
  );

  const loadBuffer = useCallback(
    async (name) => {
      if (!unsavedDir) return null;
      return await opfsRead(name, unsavedDir);
    },
    [unsavedDir, opfsRead],
  );

  const removeBuffer = useCallback(
    async (name) => {
      if (unsavedDir) await opfsDelete(name, unsavedDir);
    },
    [unsavedDir, opfsDelete],
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
      addRecentDir(handle);
      setRecent(await getRecentDirs());
      setPath([{ name: handle.name || '/', handle }]);
      await readDir(handle);
      setLocationError(null);
      setSelectedNames([]);
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
      setSelectedNames([]);
    } catch {}
  };

  const openFile = async (file) => {
    setCurrentFile(file);
    setSelectedNames([file.name]);
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
        if (active) {
          setLocationError(null);
          setSelectedNames([]);
        }
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
    setSelectedNames([]);
  };

  const navigateTo = async (index) => {
    const target = path[index];
    if (!target || !target.handle) return;
    setDirHandle(target.handle);
    setPath(path.slice(0, index + 1));
    await readDir(target.handle);
    setLocationError(null);
    setSelectedNames([]);
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
      setSelectedNames([]);
    }
  };

  const toggleFileSelection = useCallback((file, extend = false) => {
    setSelectedNames((prev) => {
      const exists = prev.includes(file.name);
      if (extend) {
        if (exists) return prev.filter((name) => name !== file.name);
        return [...prev, file.name];
      }
      if (exists && prev.length === 1) return [];
      return [file.name];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNames([]);
  }, []);

  const performRename = useCallback(
    async (plan, options = {}) => {
      const dryRun = !!(options && options.dryRun);
      const recordHistory =
        options && Object.prototype.hasOwnProperty.call(options, 'recordHistory')
          ? options.recordHistory
          : !dryRun;

      if (!Array.isArray(plan) || plan.length === 0) return [];

      if (!dirHandle) {
        return plan.map((entry) => ({
          originalName: entry?.item?.name || '',
          newName: entry?.nextName || '',
          success: false,
          error: 'No directory selected',
        }));
      }

      const duplicates = new Map();
      for (const entry of plan) {
        if (!entry?.nextName) continue;
        duplicates.set(entry.nextName, (duplicates.get(entry.nextName) || 0) + 1);
      }

      const results = [];
      const successful = [];

      for (const entry of plan) {
        if (!entry || !entry.item) {
          results.push({
            originalName: '',
            newName: entry?.nextName || '',
            success: false,
            error: 'Invalid rename entry',
          });
          continue;
        }

        const originalName = entry.item.name;
        const nextName = (entry.nextName || '').trim();

        if (!nextName) {
          results.push({
            originalName,
            newName: nextName,
            success: false,
            error: 'Resulting name cannot be empty',
          });
          continue;
        }

        if ((duplicates.get(nextName) || 0) > 1) {
          results.push({
            originalName,
            newName: nextName,
            success: false,
            error: 'Duplicate target name',
          });
          continue;
        }

        if (nextName === originalName) {
          results.push({ originalName, newName: nextName, success: true });
          continue;
        }

        const targetExists = async () => {
          try {
            await dirHandle.getFileHandle(nextName);
            if (nextName !== originalName) return true;
          } catch {}
          try {
            await dirHandle.getDirectoryHandle(nextName);
            if (nextName !== originalName) return true;
          } catch {}
          return false;
        };

        if (dryRun) {
          const conflict = await targetExists();
          results.push({
            originalName,
            newName: nextName,
            success: !conflict,
            error: conflict ? 'An item with this name already exists' : undefined,
          });
          continue;
        }

        if (await targetExists()) {
          results.push({
            originalName,
            newName: nextName,
            success: false,
            error: 'An item with this name already exists',
          });
          continue;
        }

        try {
          const file = await entry.item.handle.getFile();
          const newHandle = await dirHandle.getFileHandle(nextName, { create: true });
          const writable = await newHandle.createWritable();
          await writable.write(await file.arrayBuffer());
          await writable.close();
          await dirHandle.removeEntry(originalName);
          if (opfsSupported) {
            const unsaved = await loadBuffer(originalName);
            if (unsaved !== null) {
              await saveBuffer(nextName, unsaved);
              await removeBuffer(originalName);
            }
          }
          if (currentFile?.name === originalName) {
            setCurrentFile({ name: nextName, handle: newHandle });
          }
          successful.push({ from: originalName, to: nextName });
          results.push({
            originalName,
            newName: nextName,
            success: true,
            handle: newHandle,
          });
        } catch (error) {
          try {
            await dirHandle.removeEntry(nextName);
          } catch {}
          results.push({
            originalName,
            newName: nextName,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to rename item',
          });
        }
      }

      if (!dryRun && successful.length) {
        if (recordHistory) {
          setRenameHistory((history) => ({
            past: [...history.past, successful.map((op) => ({ from: op.from, to: op.to }))],
            future: [],
          }));
        }
        await readDir(dirHandle);
        if (recordHistory) {
          setSelectedNames(successful.map((op) => op.to));
        }
      }

      return results;
    },
    [
      dirHandle,
      opfsSupported,
      loadBuffer,
      saveBuffer,
      removeBuffer,
      currentFile,
      readDir,
    ],
  );

  const buildPlanFromOperations = useCallback(
    async (ops, reverse = false) => {
      if (!dirHandle) return null;
      const ordered = reverse ? [...ops].reverse() : [...ops];
      const plan = [];
      for (const op of ordered) {
        const sourceName = reverse ? op.to : op.from;
        const targetName = reverse ? op.from : op.to;
        try {
          const handle = await dirHandle.getFileHandle(sourceName);
          plan.push({ item: { name: sourceName, handle }, nextName: targetName });
        } catch {
          return null;
        }
      }
      return plan;
    },
    [dirHandle],
  );

  const undoRename = useCallback(async () => {
    if (!renameHistory.past.length) return;
    const lastOps = renameHistory.past[renameHistory.past.length - 1];
    const plan = await buildPlanFromOperations(lastOps, true);
    if (!plan) return;
    const results = await performRename(plan, { dryRun: false, recordHistory: false });
    if (results.every((result) => result.success || result.newName === result.originalName)) {
      setRenameHistory((history) => ({
        past: history.past.slice(0, -1),
        future: [lastOps, ...history.future],
      }));
      setSelectedNames(lastOps.map((op) => op.from));
    }
  }, [buildPlanFromOperations, performRename, renameHistory]);

  const redoRename = useCallback(async () => {
    if (!renameHistory.future.length) return;
    const [nextOps, ...rest] = renameHistory.future;
    const plan = await buildPlanFromOperations(nextOps);
    if (!plan) return;
    const results = await performRename(plan, { dryRun: false, recordHistory: false });
    if (results.every((result) => result.success || result.newName === result.originalName)) {
      setRenameHistory((history) => ({
        past: [...history.past, nextOps],
        future: rest,
      }));
      setSelectedNames(nextOps.map((op) => op.to));
    }
  }, [buildPlanFromOperations, performRename, renameHistory]);

  const openRenameDialog = useCallback(() => {
    if (!selectedItems.length) return;
    setBulkRenameOpen(true);
  }, [selectedItems.length]);

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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        if (selectedItems.length) setBulkRenameOpen(true);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redoRename();
        } else {
          undoRename();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems.length, undoRename, redoRename]);

  const hasSelection = selectedItems.length > 0;
  const hasUndo = renameHistory.past.length > 0;
  const hasRedo = renameHistory.future.length > 0;

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
        <div className="flex flex-wrap items-center gap-2 p-2 bg-ub-warm-grey bg-opacity-40">
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
        <button
          onClick={openRenameDialog}
          disabled={!hasSelection}
          className={`px-2 py-1 rounded ${
            hasSelection
              ? 'bg-black bg-opacity-50 hover:bg-opacity-60'
              : 'bg-black bg-opacity-20 text-gray-400 cursor-not-allowed'
          }`}
        >
          Bulk Rename (Ctrl+Shift+R)
        </button>
        <button
          onClick={undoRename}
          disabled={!hasUndo}
          className={`px-2 py-1 rounded ${
            hasUndo
              ? 'bg-black bg-opacity-50 hover:bg-opacity-60'
              : 'bg-black bg-opacity-20 text-gray-400 cursor-not-allowed'
          }`}
        >
          Undo
        </button>
        <button
          onClick={redoRename}
          disabled={!hasRedo}
          className={`px-2 py-1 rounded ${
            hasRedo
              ? 'bg-black bg-opacity-50 hover:bg-opacity-60'
              : 'bg-black bg-opacity-20 text-gray-400 cursor-not-allowed'
          }`}
        >
          Redo
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div
          className="w-56 overflow-auto border-r border-gray-600"
          onClick={(e) => {
            if (e.target === e.currentTarget) clearSelection();
          }}
        >
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
          {files.map((f) => {
            const selected = selectedNames.includes(f.name);
            return (
              <div
                key={f.name}
                className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-30 ${
                  selected ? 'bg-black bg-opacity-50' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFileSelection(f, e.ctrlKey || e.metaKey);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  openFile(f);
                }}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${f.name}`}
                  checked={selected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleFileSelection(f, true);
                  }}
                />
                <span className="truncate">{f.name}</span>
              </div>
            );
          })}
        </div>
        <div className="flex-1 flex flex-col">
            {currentFile && (
              <textarea
                className="flex-1 p-2 bg-ub-cool-grey outline-none"
                value={content}
                onChange={onChange}
                aria-label="File viewer"
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
      {bulkRenameOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={() => setBulkRenameOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BulkRename
              items={selectedItems}
              onClose={() => setBulkRenameOpen(false)}
              onSubmit={performRename}
            />
          </div>
        </div>
      )}
    </div>
  );
}
