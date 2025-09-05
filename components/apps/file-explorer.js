"use client";

import React, { useState, useEffect, useRef } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import { safeLocalStorage } from '../../utils/safeStorage';

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
const SETTINGS_KEY = 'file-explorer-settings';

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
  const [showHidden, setShowHidden] = useState(
    safeLocalStorage?.getItem('file-explorer-showHidden') !== 'false'
  );
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(
        safeLocalStorage?.getItem(SETTINGS_KEY) || '{}'
      );
    } catch {
      return {};
    }
  });
  const [viewMode, setViewMode] = useState('list');
  const [zoom, setZoom] = useState(1);

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
  const currentKey = path.map((p) => p.name).join('/') || '/';

  const updateSettings = (update) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        [currentKey]: { ...prev[currentKey], ...update },
      };
      safeLocalStorage?.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const s = settings[currentKey] || {};
    setViewMode(s.viewMode || 'list');
    setZoom(s.zoom || 1);
  }, [currentKey, settings]);

  useEffect(() => {
    safeLocalStorage?.setItem(
      'file-explorer-showHidden',
      showHidden ? 'true' : 'false'
    );
    if (dirHandle) readDir(dirHandle);
  }, [showHidden]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [opfsSupported, root, getDir]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const changeViewMode = (mode) => {
    setViewMode(mode);
    updateSettings({ viewMode: mode });
  };

  const changeZoom = (delta) => {
    const z = Math.min(2, Math.max(0.5, zoom + delta));
    setZoom(z);
    updateSettings({ zoom: z });
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
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      setDirHandle(entry.handle);
      setPath([{ name: entry.name, handle: entry.handle }]);
      await readDir(entry.handle);
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

  const readDir = async (handle) => {
    const ds = [];
    const fs = [];
    for await (const [name, h] of handle.entries()) {
      if (!showHidden && name.startsWith('.')) continue;
      if (h.kind === 'file') fs.push({ name, handle: h });
      else if (h.kind === 'directory') ds.push({ name, handle: h });
    }
    setDirs(ds);
    setFiles(fs);
  };

  const openDir = async (dir) => {
    setDirHandle(dir.handle);
    setPath((p) => [...p, { name: dir.name, handle: dir.handle }]);
    await readDir(dir.handle);
  };

  const navigateTo = async (index) => {
    const target = path[index];
    if (!target) return;
    setDirHandle(target.handle);
    setPath(path.slice(0, index + 1));
    await readDir(target.handle);
  };

  const goBack = async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setPath(newPath);
    setDirHandle(prev.handle);
    await readDir(prev.handle);
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
          aria-label="fallback file input"
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
              aria-label="file contents"
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
        <select
          value={viewMode}
          onChange={(e) => changeViewMode(e.target.value)}
          className="px-2 py-1 bg-black bg-opacity-50 rounded"
        >
          <option value="icons">Icons</option>
          <option value="compact">Compact</option>
          <option value="list">List</option>
        </select>
        <div className="flex items-center">
          <button
            onClick={() => changeZoom(-0.1)}
            className="px-2 py-1 bg-black bg-opacity-50 rounded-l"
          >
            -
          </button>
          <div className="px-2 py-1 bg-black bg-opacity-50">{Math.round(zoom * 100)}%</div>
          <button
            onClick={() => changeZoom(0.1)}
            className="px-2 py-1 bg-black bg-opacity-50 rounded-r"
          >
            +
          </button>
        </div>
        <button
          onClick={() => setShowHidden((s) => !s)}
          className="px-2 py-1 bg-black bg-opacity-50 rounded"
        >
          {showHidden ? 'Hide' : 'Show'} Hidden
        </button>
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
          <div
            className={
              viewMode === 'icons'
                ? 'grid gap-2 p-2'
                : ''
            }
            style={
              viewMode === 'icons'
                ? { fontSize: `${zoom}em`, gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }
                : { fontSize: `${zoom}em` }
            }
          >
            {dirs.map((d, i) => (
              <div
                key={i}
                className={
                  viewMode === 'icons'
                    ? 'flex flex-col items-center cursor-pointer hover:bg-black hover:bg-opacity-30 p-2 rounded'
                    : `cursor-pointer hover:bg-black hover:bg-opacity-30 flex ${
                        viewMode === 'compact' ? 'px-1' : 'px-2 py-1'
                      }`
                }
                onClick={() => openDir(d)}
              >
                {viewMode === 'icons' ? (
                  <>
                    <span className="text-2xl">📁</span>
                    <span className="truncate w-full text-center">{d.name}</span>
                  </>
                ) : (
                  <>
                    <span className="mr-1">📁</span>
                    <span className="truncate">{d.name}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="p-2 font-bold">Files</div>
          <div
            className={
              viewMode === 'icons'
                ? 'grid gap-2 p-2'
                : ''
            }
            style={
              viewMode === 'icons'
                ? { fontSize: `${zoom}em`, gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }
                : { fontSize: `${zoom}em` }
            }
          >
            {files.map((f, i) => (
              <div
                key={i}
                className={
                  viewMode === 'icons'
                    ? 'flex flex-col items-center cursor-pointer hover:bg-black hover:bg-opacity-30 p-2 rounded'
                    : `cursor-pointer hover:bg-black hover:bg-opacity-30 flex ${
                        viewMode === 'compact' ? 'px-1' : 'px-2 py-1'
                      }`
                }
                onClick={() => openFile(f)}
              >
                {viewMode === 'icons' ? (
                  <>
                    <span className="text-2xl">📄</span>
                    <span className="truncate w-full text-center">{f.name}</span>
                  </>
                ) : (
                  <>
                    <span className="mr-1">📄</span>
                    <span className="truncate">{f.name}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {currentFile && (
            <textarea
              className="flex-1 p-2 bg-ub-cool-grey outline-none"
              value={content}
              onChange={onChange}
              aria-label="file contents"
            />
          )}
          <div className="p-2 border-t border-gray-600">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find in files"
              className="px-1 py-0.5 text-black"
              aria-label="find in files"
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
