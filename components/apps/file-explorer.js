"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
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
const DRAG_MIME = 'application/x-file-explorer-entry';

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

export default function FileExplorer() {
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
  const treeRef = useRef(null);
  const [selectedEntries, setSelectedEntries] = useState(() => new Set());
  const [anchorIndex, setAnchorIndex] = useState(null);

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
    const ok = !!window.showDirectoryPicker;
    setSupported(ok);
    if (ok) getRecentDirs().then(setRecent);
  }, []);

  const readDir = useCallback(async (handle) => {
    if (!handle) return;
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
    if (!opfsSupported || !root) return;
    (async () => {
      setUnsavedDir(await getDir('unsaved'));
      setDirHandle(root);
      setPath([{ name: root.name || '/', handle: root }]);
      await readDir(root);
      setSelectedEntries(new Set());
      setAnchorIndex(null);
    })();
  }, [opfsSupported, root, getDir, readDir]);

  const allEntries = useMemo(() => [...dirs, ...files], [dirs, files]);

  const entryMap = useMemo(() => {
    const map = new Map();
    allEntries.forEach((entry, index) => {
      const key = entry?.handle?.name || entry?.name;
      if (key) map.set(key, { entry, index });
    });
    return map;
  }, [allEntries]);

  useEffect(() => {
    setSelectedEntries((prev) => {
      if (!prev.size) return prev;
      const next = new Set();
      allEntries.forEach((entry) => {
        const key = entry?.handle?.name;
        if (key && prev.has(key)) next.add(key);
      });
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [allEntries]);

  useEffect(() => {
    if (anchorIndex === null) return;
    if (anchorIndex < allEntries.length) return;
    if (!allEntries.length) {
      setAnchorIndex(null);
    } else {
      setAnchorIndex(allEntries.length - 1);
    }
  }, [anchorIndex, allEntries]);

  const transferHasType = (dt, type) => {
    if (!dt?.types) return false;
    if (typeof dt.types.includes === 'function') return dt.types.includes(type);
    for (let i = 0; i < dt.types.length; i += 1) {
      if (dt.types[i] === type) return true;
    }
    return false;
  };

  const getTransferNames = (dt) => {
    if (!dt) return [];
    const raw = dt.getData(DRAG_MIME);
    if (!raw) return [];
    try {
      const payload = JSON.parse(raw);
      if (Array.isArray(payload?.names)) {
        return payload.names.filter((name) => typeof name === 'string');
      }
    } catch {}
    return [];
  };

  const getEntryName = (entry) => {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    if (entry?.handle?.name) return entry.handle.name;
    return entry?.name || '';
  };

  const saveBuffer = useCallback(
    async (entry, data, options = {}) => {
      if (!entry) return;
      if (options?.moveTarget && entry?.handle?.move) {
        try {
          await entry.handle.move(options.moveTarget);
        } catch {}
      }
      const name = getEntryName(entry);
      if (!unsavedDir || data === undefined || !name) return;
      await opfsWrite(name, data, unsavedDir);
    },
    [unsavedDir, opfsWrite],
  );

  const loadBuffer = useCallback(
    async (entry) => {
      if (!unsavedDir) return null;
      const name = getEntryName(entry);
      if (!name) return null;
      return await opfsRead(name, unsavedDir);
    },
    [unsavedDir, opfsRead],
  );

  const removeBuffer = useCallback(
    async (entry) => {
      if (!unsavedDir) return;
      const name = getEntryName(entry);
      if (!name) return;
      await opfsDelete(name, unsavedDir);
    },
    [unsavedDir, opfsDelete],
  );

  const moveEntries = useCallback(
    async (names, destinationHandle) => {
      if (!destinationHandle || !names?.length) return;
      const unique = Array.from(new Set(names));
      const entriesToMove = unique
        .map((name) => entryMap.get(name))
        .filter(Boolean)
        .map((info) => info.entry)
        .filter((entry) => entry?.handle && entry.handle !== destinationHandle);
      if (!entriesToMove.length) return;
      await Promise.all(
        entriesToMove.map(async (entry) => {
          try {
            await saveBuffer(entry, undefined, { moveTarget: destinationHandle });
          } catch {}
        }),
      );
      setSelectedEntries((prev) => {
        if (!prev.size) return prev;
        const next = new Set(prev);
        let changed = false;
        unique.forEach((name) => {
          if (next.delete(name)) changed = true;
        });
        return changed ? next : prev;
      });
      setAnchorIndex(null);
      if (dirHandle) await readDir(dirHandle);
    },
    [entryMap, saveBuffer, dirHandle, readDir],
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
      setSelectedEntries(new Set());
      setAnchorIndex(null);
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      setDirHandle(entry.handle);
      setPath([{ name: entry.name, handle: entry.handle }]);
      await readDir(entry.handle);
      setSelectedEntries(new Set());
      setAnchorIndex(null);
    } catch {}
  };

  const openFile = useCallback(
    async (file) => {
      if (!file) return;
      setCurrentFile(file);
      let text = '';
      if (opfsSupported) {
        const unsaved = await loadBuffer(file);
        if (unsaved !== null) text = unsaved;
      }
      if (!text && file.handle?.getFile) {
        const f = await file.handle.getFile();
        text = await f.text();
      }
      setContent(text);
      const key = file?.handle?.name || file?.name;
      const info = key ? entryMap.get(key) : null;
      if (info) {
        setSelectedEntries(new Set([info.entry.handle.name]));
        setAnchorIndex(info.index);
      }
    },
    [entryMap, loadBuffer, opfsSupported],
  );

  const openDir = useCallback(
    async (dir, options = {}) => {
      if (!dir?.handle) return;
      if (options?.moveEntries?.length) {
        await moveEntries(options.moveEntries, dir.handle);
        return;
      }
      setDirHandle(dir.handle);
      setPath((p) => [...p, { name: dir.name, handle: dir.handle }]);
      await readDir(dir.handle);
      setSelectedEntries(new Set());
      setAnchorIndex(null);
    },
    [moveEntries, readDir],
  );

  const handleEntryClick = useCallback(
    (event, entry) => {
      event.preventDefault();
      event.stopPropagation();
      const key = entry?.handle?.name || entry?.name;
      if (!key) return;
      const info = entryMap.get(key);
      const index = info?.index ?? -1;
      const isToggle = event.metaKey || event.ctrlKey;
      const isRange = event.shiftKey && anchorIndex !== null && anchorIndex >= 0 && index >= 0;

      if (isRange) {
        const start = Math.min(anchorIndex, index);
        const end = Math.max(anchorIndex, index);
        const rangeSet = new Set();
        for (let i = start; i <= end; i += 1) {
          const rangeEntry = allEntries[i];
          const rangeKey = rangeEntry?.handle?.name;
          if (rangeKey) rangeSet.add(rangeKey);
        }
        setSelectedEntries(rangeSet);
      } else if (isToggle && index >= 0) {
        const wasSelected = selectedEntries.has(key);
        const next = new Set(selectedEntries);
        if (wasSelected) {
          next.delete(key);
        } else {
          next.add(key);
        }
        setSelectedEntries(next);
        if (wasSelected && selectedEntries.size === 1) {
          setAnchorIndex(null);
        } else if (!wasSelected) {
          setAnchorIndex(index);
        }
      } else {
        setSelectedEntries(new Set([key]));
        setAnchorIndex(index >= 0 ? index : null);
      }
      treeRef.current?.focus();
    },
    [allEntries, anchorIndex, entryMap, selectedEntries],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      if (!allEntries.length) return;
      event.preventDefault();
      event.stopPropagation();
      let currentIndex = anchorIndex;
      if (currentIndex === null) {
        const firstSelected = selectedEntries.values().next();
        if (!firstSelected.done) {
          const info = entryMap.get(firstSelected.value);
          currentIndex = info ? info.index : 0;
        } else {
          currentIndex = 0;
        }
      }
      if (currentIndex < 0) currentIndex = 0;
      if (currentIndex >= allEntries.length) currentIndex = allEntries.length - 1;

      let nextIndex = currentIndex;
      if (event.key === 'ArrowDown') nextIndex = Math.min(allEntries.length - 1, currentIndex + 1);
      else if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = allEntries.length - 1;

      if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= allEntries.length) return;
      const nextEntry = allEntries[nextIndex];
      const key = nextEntry?.handle?.name;
      if (!key) return;
      setSelectedEntries(new Set([key]));
      setAnchorIndex(nextIndex);
    },
    [allEntries, anchorIndex, entryMap, selectedEntries],
  );

  const handleDragStart = useCallback(
    (event, entry) => {
      const key = entry?.handle?.name;
      const dt = event.dataTransfer;
      if (!dt || !key) return;
      let names;
      if (selectedEntries.has(key)) {
        names = Array.from(selectedEntries);
      } else {
        names = [key];
        setSelectedEntries(new Set(names));
        const info = entryMap.get(key);
        if (info) setAnchorIndex(info.index);
      }
      try {
        dt.effectAllowed = 'move';
        dt.setData(DRAG_MIME, JSON.stringify({ names }));
        dt.setData('text/plain', names.join(', '));
      } catch {}
    },
    [selectedEntries, entryMap],
  );

  const handleDirDragOver = useCallback((event) => {
    if (!transferHasType(event.dataTransfer, DRAG_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropOnDir = useCallback(
    async (event, dir) => {
      if (!transferHasType(event.dataTransfer, DRAG_MIME)) return;
      event.preventDefault();
      event.stopPropagation();
      const names = getTransferNames(event.dataTransfer);
      if (!names.length) return;
      await openDir(dir, { moveEntries: names });
    },
    [openDir],
  );

  const handleRootDragOver = useCallback(
    (event) => {
      if (!transferHasType(event.dataTransfer, DRAG_MIME)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
    },
    [],
  );

  const handleRootDrop = useCallback(
    async (event) => {
      if (!transferHasType(event.dataTransfer, DRAG_MIME)) return;
      event.preventDefault();
      event.stopPropagation();
      const names = getTransferNames(event.dataTransfer);
      if (!names.length || !dirHandle) return;
      await moveEntries(names, dirHandle);
    },
    [dirHandle, moveEntries],
  );

  const navigateTo = async (index) => {
    const target = path[index];
    if (!target) return;
    setDirHandle(target.handle);
    setPath(path.slice(0, index + 1));
    await readDir(target.handle);
    setSelectedEntries(new Set());
    setAnchorIndex(null);
  };

  const goBack = async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setPath(newPath);
    setDirHandle(prev.handle);
    await readDir(prev.handle);
    setSelectedEntries(new Set());
    setAnchorIndex(null);
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile);
    } catch {}
  };

  const onChange = (e) => {
    const text = e.target.value;
    setContent(text);
    if (opfsSupported && currentFile) saveBuffer(currentFile, text);
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
        {currentFile && (
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div
          className="w-40 overflow-auto border-r border-gray-600"
          role="tree"
          aria-label="Directory tree"
          aria-multiselectable="true"
          tabIndex={0}
          ref={treeRef}
          onKeyDown={handleKeyDown}
          data-testid="file-explorer-tree"
          onDragOver={handleRootDragOver}
          onDrop={handleRootDrop}
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
          {dirs.map((d) => {
            const key = d?.handle?.name || d?.name;
            const selected = key ? selectedEntries.has(key) : false;
            return (
              <div
                key={key || d.name}
                role="treeitem"
                aria-selected={selected}
                tabIndex={-1}
                className={`px-2 cursor-pointer hover:bg-black hover:bg-opacity-30 select-none${
                  selected ? ' bg-black bg-opacity-60' : ''
                }`}
                draggable={!!d?.handle}
                onClick={(event) => handleEntryClick(event, d)}
                onDoubleClick={() => openDir(d)}
                onDragStart={(event) => handleDragStart(event, d)}
                onDragOver={handleDirDragOver}
                onDrop={(event) => handleDropOnDir(event, d)}
              >
                {d.name}
              </div>
            );
          })}
          <div className="p-2 font-bold">Files</div>
          {files.map((f) => {
            const key = f?.handle?.name || f?.name;
            const selected = key ? selectedEntries.has(key) : false;
            return (
              <div
                key={key || f.name}
                role="treeitem"
                aria-selected={selected}
                tabIndex={-1}
                className={`px-2 cursor-pointer hover:bg-black hover:bg-opacity-30 select-none${
                  selected ? ' bg-black bg-opacity-60' : ''
                }`}
                draggable={!!f?.handle}
                onClick={(event) => handleEntryClick(event, f)}
                onDoubleClick={() => openFile(f)}
                onDragStart={(event) => handleDragStart(event, f)}
              >
                {f.name}
              </div>
            );
          })}
        </div>
        <div className="flex-1 flex flex-col">
          {currentFile && (
            <textarea className="flex-1 p-2 bg-ub-cool-grey outline-none" value={content} onChange={onChange} />
          )}
          <div className="p-2 border-t border-gray-600">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find in files"
              className="px-1 py-0.5 text-black"
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
    </div>
  );
}
