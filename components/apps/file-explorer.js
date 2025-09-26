"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import useDynamicVirtualizer from '../../hooks/useDynamicVirtualizer';

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
  const sidebarRef = useRef(null);
  const resultsRef = useRef(null);

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

  const sidebarItems = useMemo(() => {
    const items = [];
    const sections = [
      { id: 'recent', label: 'Recent', data: recent },
      { id: 'dirs', label: 'Directories', data: dirs },
      { id: 'files', label: 'Files', data: files },
    ];

    sections.forEach((section) => {
      items.push({
        kind: 'section',
        key: `section-${section.id}`,
        label: section.label,
      });

      if (!section.data.length) {
        items.push({
          kind: 'empty',
          key: `empty-${section.id}`,
          label:
            section.id === 'recent'
              ? 'No recent directories'
              : section.id === 'dirs'
                ? 'No directories'
                : 'No files',
        });
        return;
      }

      section.data.forEach((entry, index) => {
        items.push({
          kind: 'entry',
          key: `${section.id}-${entry.name}-${index}`,
          label: entry.name,
          section: section.id,
          index,
        });
      });
    });

    return items;
  }, [recent, dirs, files]);

  const interactiveCount = useMemo(
    () => sidebarItems.filter((item) => item.kind === 'entry').length,
    [sidebarItems],
  );

  const interactivePositions = useMemo(() => {
    let pos = 0;
    return sidebarItems.map((item) => {
      if (item.kind === 'entry') {
        pos += 1;
        return pos;
      }
      return null;
    });
  }, [sidebarItems]);

  const estimateSidebarSize = useCallback(
    (index) => {
      const entry = sidebarItems[index];
      if (!entry) return 32;
      if (entry.kind === 'section') return 32;
      if (entry.kind === 'empty') return 28;
      return 36;
    },
    [sidebarItems],
  );

  const { virtualizer: sidebarVirtualizer, measureElement: measureSidebarElement } =
    useDynamicVirtualizer({
      count: sidebarItems.length,
      estimateSize: estimateSidebarSize,
      overscan: 8,
      scrollRef: sidebarRef,
    });

  const estimateResultsSize = useCallback(() => 32, []);

  const { virtualizer: resultsVirtualizer, measureElement: measureResultsElement } =
    useDynamicVirtualizer({
      count: results.length,
      estimateSize: estimateResultsSize,
      overscan: 4,
      scrollRef: resultsRef,
    });

  const handleSidebarActivate = useCallback(
    (entry) => {
      if (entry.kind !== 'entry') return;
      if (entry.section === 'recent') {
        const target = recent[entry.index];
        if (target) openRecent(target);
      } else if (entry.section === 'dirs') {
        const target = dirs[entry.index];
        if (target) openDir(target);
      } else if (entry.section === 'files') {
        const target = files[entry.index];
        if (target) openFile(target);
      }
    },
    [dirs, files, recent, openDir, openFile, openRecent],
  );

  useEffect(() => {
    sidebarVirtualizer.measure();
  }, [sidebarItems, sidebarVirtualizer]);

  useEffect(() => {
    resultsVirtualizer.measure();
  }, [results, resultsVirtualizer]);

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

  const openRecent = useCallback(
    async (entry) => {
      try {
        const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') return;
        setDirHandle(entry.handle);
        setPath([{ name: entry.name, handle: entry.handle }]);
        await readDir(entry.handle);
        setLocationError(null);
      } catch {}
    },
    [readDir],
  );

  const openFile = useCallback(
    async (file) => {
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
    },
    [loadBuffer, opfsSupported],
  );

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

  const openDir = useCallback(
    async (dir) => {
      setDirHandle(dir.handle);
      setPath((p) => [...p, { name: dir.name, handle: dir.handle }]);
      await readDir(dir.handle);
      setLocationError(null);
    },
    [readDir],
  );

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
        <div
          ref={sidebarRef}
          className="w-40 overflow-auto border-r border-gray-600 focus:outline-none"
          role="list"
          aria-label="Directory navigator"
        >
          <div style={{ height: sidebarVirtualizer.getTotalSize(), position: 'relative' }}>
            {sidebarVirtualizer.getVirtualItems().map((virtualRow) => {
              const entry = sidebarItems[virtualRow.index];
              if (!entry) return null;
              const style = {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              };

              if (entry.kind === 'section') {
                return (
                  <div
                    key={virtualRow.key}
                    ref={measureSidebarElement}
                    style={style}
                    className="bg-ub-cool-grey bg-opacity-60"
                  >
                    <div className="p-2 text-xs font-bold uppercase tracking-wide" role="heading" aria-level={2}>
                      {entry.label}
                    </div>
                  </div>
                );
              }

              if (entry.kind === 'empty') {
                return (
                  <div
                    key={virtualRow.key}
                    ref={measureSidebarElement}
                    style={style}
                    className="px-2 py-1 text-xs text-gray-300"
                    role="note"
                  >
                    {entry.label}
                  </div>
                );
              }

              const pos = interactivePositions[virtualRow.index] ?? undefined;
              const setSize = interactiveCount || undefined;
              return (
                <div
                  key={virtualRow.key}
                  ref={measureSidebarElement}
                  style={style}
                  role="listitem"
                  aria-setsize={setSize}
                  aria-posinset={pos}
                  className="px-1"
                >
                  <button
                    type="button"
                    onClick={() => handleSidebarActivate(entry)}
                    className="w-full rounded px-2 py-1 text-left hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {entry.label}
                  </button>
                </div>
              );
            })}
          </div>
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
            <div
              ref={resultsRef}
              className="max-h-40 overflow-auto mt-2"
              role="list"
              aria-label="Search results"
            >
              {results.length === 0 ? (
                <p className="px-2 py-1 text-xs text-gray-300" role="note">
                  {query ? 'No matches yet.' : 'Run a search to find text within files.'}
                </p>
              ) : (
                <div style={{ height: resultsVirtualizer.getTotalSize(), position: 'relative' }}>
                  {resultsVirtualizer.getVirtualItems().map((virtualRow) => {
                    const result = results[virtualRow.index];
                    if (!result) return null;
                    return (
                      <div
                        key={virtualRow.key}
                        ref={measureResultsElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="px-2 py-1 odd:bg-black/20"
                        role="listitem"
                        aria-setsize={results.length}
                        aria-posinset={virtualRow.index + 1}
                      >
                        <span className="font-bold">{result.file}:{result.line}</span>{' '}
                        {result.text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
