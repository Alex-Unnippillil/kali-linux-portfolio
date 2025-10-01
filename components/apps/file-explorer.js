"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
const SEARCH_STORE = 'searches';
const SEARCH_REFRESH_INTERVAL = 4000;

function openDB() {
  return getDb(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(SEARCH_STORE)) {
        db.createObjectStore(SEARCH_STORE, { keyPath: 'id' });
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

async function getSavedSearches() {
  try {
    const dbp = openDB();
    if (!dbp) return [];
    const db = await dbp;
    if (!db.objectStoreNames.contains(SEARCH_STORE)) return [];
    return (await db.getAll(SEARCH_STORE)) || [];
  } catch {
    return [];
  }
}

async function putSavedSearch(search) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    if (!db.objectStoreNames.contains(SEARCH_STORE)) return;
    await db.put(SEARCH_STORE, search);
  } catch {}
}

async function deleteSavedSearch(id) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    if (!db.objectStoreNames.contains(SEARCH_STORE)) return;
    await db.delete(SEARCH_STORE, id);
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
  const [savedSearches, setSavedSearches] = useState([]);
  const savedSearchesRef = useRef([]);
  const [activeSavedSearchId, setActiveSavedSearchId] = useState(null);
  const [savedSearchResults, setSavedSearchResults] = useState({});
  const refreshTimerRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const refreshAllSavedSearchesRef = useRef(() => Promise.resolve());

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

  useEffect(() => {
    savedSearchesRef.current = savedSearches;
  }, [savedSearches]);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    (async () => {
      const stored = await getSavedSearches();
      if (!active) return;
      savedSearchesRef.current = stored;
      setSavedSearches(stored);
      setSavedSearchResults((prev) => {
        const next = { ...prev };
        stored.forEach((search) => {
          if (!next[search.id]) next[search.id] = [];
        });
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, [supported]);

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
    refreshAllSavedSearchesRef.current?.();
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

  const runDirectorySearch = useCallback(
    async (searchQuery, { onResult, onComplete } = {}) => {
      if (!dirHandle) return [];
      const trimmed = (searchQuery || '').trim();
      if (!trimmed) return [];

      const runWithoutWorker = async () => {
        const matches = [];
        async function* iterate(handle, prefix = '') {
          for await (const [name, child] of handle.entries()) {
            const path = prefix ? `${prefix}/${name}` : name;
            if (child.kind === 'file') {
              yield { handle: child, path };
            } else if (child.kind === 'directory') {
              yield* iterate(child, path);
            }
          }
        }

        for await (const { handle, path } of iterate(dirHandle)) {
          try {
            const file = await handle.getFile();
            const text = await file.text();
            const lines = text.split(/\r?\n/);
            lines.forEach((line, idx) => {
              if (line.includes(trimmed)) {
                const result = { file: path, line: idx + 1, text: line };
                matches.push(result);
                onResult?.(result);
              }
            });
          } catch {}
        }
        onComplete?.(matches);
        return matches;
      };

      const runWithWorker = () =>
        new Promise((resolve, reject) => {
          try {
            if (workerRef.current) workerRef.current.terminate();
            workerRef.current = new Worker(new URL('./find.worker.js', import.meta.url));
          } catch (error) {
            reject(error);
            return;
          }

          const collected = [];
          workerRef.current.onmessage = (e) => {
            const { file, line, text, done } = e.data || {};
            if (done) {
              workerRef.current?.terminate();
              workerRef.current = null;
              onComplete?.(collected);
              resolve(collected);
              return;
            }
            if (file) {
              const result = { file, line, text };
              collected.push(result);
              onResult?.(result);
            }
          };
          workerRef.current.postMessage({ directoryHandle: dirHandle, query: trimmed });
        });

      if (hasWorker && typeof window !== 'undefined' && typeof Worker === 'function') {
        try {
          return await runWithWorker();
        } catch {
          return await runWithoutWorker();
        }
      }
      return await runWithoutWorker();
    },
    [dirHandle, hasWorker]
  );

  const runSearch = useCallback(() => {
    setResults([]);
    runDirectorySearch(query, {
      onResult: (result) => {
        setResults((prev) => [...prev, result]);
      },
    });
  }, [query, runDirectorySearch]);

  const refreshSavedSearch = useCallback(
    async (search) => {
      if (!search) return [];
      const matches = await runDirectorySearch(search.query);
      const enriched = {
        ...search,
        lastRun: Date.now(),
        lastResultCount: matches.length,
        updatedAt: Date.now(),
      };
      savedSearchesRef.current = savedSearchesRef.current.map((s) => (s.id === search.id ? enriched : s));
      setSavedSearches(savedSearchesRef.current);
      setSavedSearchResults((prev) => ({ ...prev, [search.id]: matches }));
      await putSavedSearch(enriched);
      return matches;
    },
    [runDirectorySearch]
  );

  const refreshAllSavedSearches = useCallback(async () => {
    const searches = [...savedSearchesRef.current];
    for (const search of searches) {
      await refreshSavedSearch(search);
    }
  }, [refreshSavedSearch]);

  const createSavedSearch = useCallback(async () => {
    const trimmed = (query || '').trim();
    if (!trimmed) return;
    const defaultName = trimmed;
    const response = typeof window !== 'undefined' ? window.prompt('Name this search', defaultName) : defaultName;
    if (response === null) return;
    const name = (response || '').trim();
    if (!name) return;
    const now = Date.now();
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `search-${now}-${Math.random().toString(16).slice(2)}`;
    const search = {
      id,
      name,
      query: trimmed,
      createdAt: now,
      updatedAt: now,
      lastRun: null,
      lastResultCount: 0,
    };
    savedSearchesRef.current = [...savedSearchesRef.current, search];
    setSavedSearches(savedSearchesRef.current);
    setSavedSearchResults((prev) => ({ ...prev, [search.id]: [] }));
    await putSavedSearch(search);
    setActiveSavedSearchId(search.id);
    setCurrentFile(null);
    await refreshSavedSearch(search);
  }, [query, refreshSavedSearch]);

  const renameSavedSearch = useCallback(async (search) => {
    if (!search) return;
    const response = typeof window !== 'undefined' ? window.prompt('Rename search', search.name) : search.name;
    if (response === null) return;
    const nextName = (response || '').trim();
    if (!nextName || nextName === search.name) return;
    const updated = { ...search, name: nextName, updatedAt: Date.now() };
    savedSearchesRef.current = savedSearchesRef.current.map((s) => (s.id === search.id ? updated : s));
    setSavedSearches(savedSearchesRef.current);
    await putSavedSearch(updated);
  }, []);

  const removeSavedSearch = useCallback(
    async (search) => {
      if (!search) return;
      savedSearchesRef.current = savedSearchesRef.current.filter((s) => s.id !== search.id);
      setSavedSearches(savedSearchesRef.current);
      setSavedSearchResults((prev) => {
        const next = { ...prev };
        delete next[search.id];
        return next;
      });
      if (activeSavedSearchId === search.id) {
        setActiveSavedSearchId(null);
        setResults([]);
      }
      await deleteSavedSearch(search.id);
    },
    [activeSavedSearchId]
  );

  const openSavedSearch = useCallback(
    (search) => {
      if (!search) return;
      setActiveSavedSearchId(search.id);
      setCurrentFile(null);
      setQuery(search.query);
      refreshSavedSearch(search);
    },
    [refreshSavedSearch]
  );

  useEffect(() => {
    refreshAllSavedSearchesRef.current = refreshAllSavedSearches;
  }, [refreshAllSavedSearches]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (!dirHandle || savedSearchesRef.current.length === 0) return;

    const tick = async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        await refreshAllSavedSearchesRef.current?.();
      } finally {
        isRefreshingRef.current = false;
      }
    };

    const id = setInterval(tick, SEARCH_REFRESH_INTERVAL);
    refreshTimerRef.current = id;
    return () => {
      clearInterval(id);
      refreshTimerRef.current = null;
    };
  }, [dirHandle, savedSearches.length]);

  const activeSavedSearch = activeSavedSearchId
    ? savedSearches.find((search) => search.id === activeSavedSearchId) || null
    : null;
  const activeResults = activeSavedSearch
    ? savedSearchResults[activeSavedSearch.id] || []
    : results;

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
          <div className="p-2 font-bold">Saved Searches</div>
          {savedSearches.length === 0 && (
            <div className="px-2 text-xs text-gray-300">No saved searches yet</div>
          )}
          {savedSearches.map((search) => {
            const isActive = activeSavedSearchId === search.id;
            const matchCount = savedSearchResults[search.id]?.length ?? search.lastResultCount ?? 0;
            return (
              <div
                key={search.id}
                className={`px-2 py-1 space-y-1 ${
                  isActive ? 'bg-black bg-opacity-40' : 'hover:bg-black hover:bg-opacity-30'
                }`}
              >
                <div className="flex items-center justify-between space-x-2">
                  <button
                    type="button"
                    onClick={() => openSavedSearch(search)}
                    className="text-left flex-1 truncate"
                  >
                    {search.name}
                  </button>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      className="text-xs px-1 py-0.5 bg-black bg-opacity-40 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        renameSavedSearch(search);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="text-xs px-1 py-0.5 bg-black bg-opacity-40 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedSearch(search);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-300">
                  Matches: {matchCount}
                  {search.lastRun && (
                    <>
                      {' '}
                      • Last run:{' '}
                      {new Date(search.lastRun).toLocaleTimeString()}
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
            <button
              onClick={createSavedSearch}
              className="ml-2 px-2 py-1 bg-black bg-opacity-50 rounded"
              disabled={!query.trim()}
            >
              Save Search
            </button>
            {activeSavedSearch && (
              <div className="mt-2 text-xs text-gray-200">
                Viewing saved search: <strong>{activeSavedSearch.name}</strong>
              </div>
            )}
            <div className="max-h-40 overflow-auto mt-2">
              {activeResults.map((r, i) => (
                <div key={i}>
                  <span className="font-bold">{r.file}:{r.line}</span> {r.text}
                </div>
              ))}
              {activeResults.length === 0 && (
                <div className="text-xs text-gray-300">No matches found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
