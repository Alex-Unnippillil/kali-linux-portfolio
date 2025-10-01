"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import { groupRecentEntries, RECENT_GROUPS } from './file-explorer/recents';

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
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.store;
    const [values, keys] = await Promise.all([
      store.getAll(),
      store.getAllKeys(),
    ]);
    await tx.done;
    const entries = values.map((value, index) => ({
      id: keys[index],
      name: value?.name,
      handle: value?.handle,
      pinned: Boolean(value?.pinned),
      lastAccessed:
        typeof value?.lastAccessed === 'number' ? value.lastAccessed : 0,
    }));
    entries.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    });
    return entries;
  } catch {
    return [];
  }
}

async function addRecentDir(handle) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;
    const now = Date.now();
    let cursor = await store.openCursor();
    let updated = false;
    while (cursor) {
      const value = cursor.value || {};
      let matches = false;
      if (value.handle && typeof value.handle.isSameEntry === 'function') {
        try {
          matches = await value.handle.isSameEntry(handle);
        } catch {
          matches = false;
        }
      }
      if (!matches && value.name === handle.name) {
        matches = true;
      }
      if (matches) {
        await cursor.update({
          ...value,
          name: handle.name,
          handle,
          lastAccessed: now,
        });
        updated = true;
        break;
      }
      cursor = await cursor.continue();
    }
    if (!updated) {
      await store.add({
        name: handle.name,
        handle,
        pinned: false,
        lastAccessed: now,
      });
    }
    await tx.done;
  } catch {}
}

async function setRecentPinned(id, pinned) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;
    const existing = await store.get(id);
    if (existing) {
      await store.put({
        ...existing,
        pinned,
        lastAccessed:
          typeof existing.lastAccessed === 'number'
            ? existing.lastAccessed
            : Date.now(),
      }, id);
    }
    await tx.done;
  } catch {}
}

async function touchRecentDir(id) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;
    const existing = await store.get(id);
    if (existing) {
      await store.put({ ...existing, lastAccessed: Date.now() }, id);
    }
    await tx.done;
  } catch {}
}

async function deleteRecentDirs(ids) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;
    await Promise.all(ids.map((id) => store.delete(id).catch(() => {})));
    await tx.done;
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
  const recentItemRefs = useRef([]);
  const [recentFocusIndex, setRecentFocusIndex] = useState(0);
  const { pinned, groups } = useMemo(() => groupRecentEntries(recent), [recent]);
  const orderedGroups = useMemo(
    () =>
      RECENT_GROUPS.map((definition) => {
        const match = groups.find((group) => group.id === definition.id);
        return match || { ...definition, entries: [] };
      }),
    [groups],
  );
  const focusableEntries = useMemo(
    () => [...pinned, ...orderedGroups.flatMap((group) => group.entries)],
    [pinned, orderedGroups],
  );
  const focusIndexMap = useMemo(() => {
    const map = new Map();
    focusableEntries.forEach((entry, index) => {
      map.set(entry, index);
    });
    return map;
  }, [focusableEntries]);

  useEffect(() => {
    recentItemRefs.current = recentItemRefs.current.slice(0, focusableEntries.length);
    if (focusableEntries.length === 0) {
      if (recentFocusIndex !== 0) {
        setRecentFocusIndex(0);
      }
      return;
    }
    const maxIndex = focusableEntries.length - 1;
    if (recentFocusIndex > maxIndex) {
      setRecentFocusIndex(maxIndex);
    }
  }, [focusableEntries.length, recentFocusIndex]);

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
  }, [getDir, opfsSupported, readDir, root]);

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
      await addRecentDir(handle);
      setRecent(await getRecentDirs());
      setPath([{ name: handle.name || '/', handle }]);
      await readDir(handle);
      setLocationError(null);
    } catch {}
  };

  const openRecent = useCallback(
    async (entry) => {
      if (!entry?.handle) return;
      try {
        const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') return;
        setDirHandle(entry.handle);
        setPath([{ name: entry.name, handle: entry.handle }]);
        await readDir(entry.handle);
        if (typeof entry.id !== 'undefined') {
          await touchRecentDir(entry.id);
        }
        setRecent(await getRecentDirs());
        setLocationError(null);
      } catch {}
    },
    [readDir],
  );

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

  const handleTogglePin = async (event, entry) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof entry?.id === 'undefined') return;
    await setRecentPinned(entry.id, !entry.pinned);
    setRecent(await getRecentDirs());
  };

  const handleClearGroup = useCallback(
    async (groupId) => {
      const group = orderedGroups.find((g) => g.id === groupId);
      if (!group) return;
      const ids = group.entries
        .map((entry) => entry?.id)
        .filter((id) => typeof id !== 'undefined');
      if (!ids.length) return;
      await deleteRecentDirs(ids);
      setRecent(await getRecentDirs());
    },
    [orderedGroups],
  );

  const handleClearPinned = useCallback(async () => {
    const ids = pinned
      .map((entry) => entry?.id)
      .filter((id) => typeof id !== 'undefined');
    if (!ids.length) return;
    await Promise.all(ids.map((id) => setRecentPinned(id, false)));
    setRecent(await getRecentDirs());
  }, [pinned]);

  const handleRecentKeyDown = useCallback(
    (event, index, entry) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!focusableEntries.length) return;
        const next = (index + 1) % focusableEntries.length;
        setRecentFocusIndex(next);
        const node = recentItemRefs.current[next];
        if (node && typeof node.focus === 'function') {
          node.focus();
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!focusableEntries.length) return;
        const prev = (index - 1 + focusableEntries.length) % focusableEntries.length;
        setRecentFocusIndex(prev);
        const node = recentItemRefs.current[prev];
        if (node && typeof node.focus === 'function') {
          node.focus();
        }
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        if (!focusableEntries.length) return;
        setRecentFocusIndex(0);
        const node = recentItemRefs.current[0];
        if (node && typeof node.focus === 'function') {
          node.focus();
        }
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        if (!focusableEntries.length) return;
        const last = focusableEntries.length - 1;
        setRecentFocusIndex(last);
        const node = recentItemRefs.current[last];
        if (node && typeof node.focus === 'function') {
          node.focus();
        }
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openRecent(entry);
      }
    },
    [focusableEntries.length, openRecent],
  );

  const renderRecentEntry = (entry, key) => {
    const index = focusIndexMap.get(entry);
    const isActive = typeof index === 'number' && recentFocusIndex === index;
    const tabIndex = typeof index === 'number' ? (isActive ? 0 : -1) : -1;
    return (
      <div
        key={key}
        role="option"
        aria-selected={isActive ? 'true' : 'false'}
        tabIndex={tabIndex}
        ref={(node) => {
          if (typeof index === 'number') {
            recentItemRefs.current[index] = node;
          }
        }}
        onFocus={() => {
          if (typeof index === 'number') {
            setRecentFocusIndex(index);
          }
        }}
        onKeyDown={(event) => {
          if (typeof index === 'number') {
            handleRecentKeyDown(event, index, entry);
          }
        }}
        onClick={() => openRecent(entry)}
        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
          isActive ? 'bg-black bg-opacity-40' : 'hover:bg-black hover:bg-opacity-30'
        }`}
      >
        <span className="flex-1 truncate">{entry?.name || 'Unknown'}</span>
        <button
          type="button"
          onClick={(event) => handleTogglePin(event, entry)}
          className="text-xs px-1 py-0.5 bg-black bg-opacity-30 rounded hover:bg-opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
          aria-pressed={entry?.pinned ? 'true' : 'false'}
          aria-label={entry?.pinned ? 'Unpin directory' : 'Pin directory'}
        >
          {entry?.pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
    );
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
        <div className="w-56 overflow-auto border-r border-gray-600 flex-shrink-0">
          <div className="py-2 space-y-3">
            {pinned.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 py-1 font-bold">
                  <span>Pinned</span>
                  <button
                    type="button"
                    onClick={handleClearPinned}
                    className="text-xs text-ubt-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue rounded px-1 py-0.5"
                    aria-label="Unpin all pinned directories"
                  >
                    Clear
                  </button>
                </div>
                <div
                  role="listbox"
                  aria-label="Pinned directories"
                  className="flex flex-col gap-1"
                >
                  {pinned.map((entry, index) =>
                    renderRecentEntry(entry, `pinned-${entry?.id ?? index}`)
                  )}
                </div>
              </div>
            )}
            {orderedGroups.map((group) => (
              <div key={group.id}>
                <div className="flex items-center justify-between px-2 py-1 font-bold">
                  <span>{group.label}</span>
                  {group.entries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearGroup(group.id)}
                      className="text-xs text-ubt-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue rounded px-1 py-0.5"
                      aria-label={`Clear ${group.label.toLowerCase()} recents`}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div
                  role="listbox"
                  aria-label={`${group.label} recent directories`}
                  className="flex flex-col gap-1"
                >
                  {group.entries.length > 0 ? (
                    group.entries.map((entry, index) =>
                      renderRecentEntry(entry, `${group.id}-${entry?.id ?? index}`)
                    )
                  ) : (
                    <div className="px-2 py-1 text-xs text-gray-300">No recents</div>
                  )}
                </div>
              </div>
            ))}
            <div>
              <div className="px-2 py-1 font-bold">Directories</div>
              <div className="flex flex-col">
                {dirs.map((d, i) => (
                  <button
                    key={`${d.name}-${i}`}
                    type="button"
                    onClick={() => openDir(d)}
                    className="px-2 py-1 text-left rounded hover:bg-black hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="px-2 py-1 font-bold">Files</div>
              <div className="flex flex-col">
                {files.map((f, i) => (
                  <button
                    key={`${f.name}-${i}`}
                    type="button"
                    onClick={() => openFile(f)}
                    className="px-2 py-1 text-left rounded hover:bg-black hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
              aria-label="Find text in files"
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
