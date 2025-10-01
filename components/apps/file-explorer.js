"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import ExplorerView from './file-explorer/ExplorerView';

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
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedEntries, setSelectedEntries] = useState([]);

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

  const selectedEntrySet = useMemo(
    () => new Set(selectedEntries),
    [selectedEntries],
  );

  const explorerItems = useMemo(() => {
    const dirItems = dirs.map((dir) => ({
      key: `directory:${dir.name}`,
      name: dir.name,
      kind: 'directory',
      handle: dir.handle,
    }));
    const fileItems = files.map((file) => ({
      key: `file:${file.name}`,
      name: file.name,
      kind: 'file',
      handle: file.handle,
    }));
    return [...dirItems, ...fileItems];
  }, [dirs, files]);

  useEffect(() => {
    setSelectedEntries((prev) => {
      const validKeys = new Set(explorerItems.map((item) => item.key));
      const filtered = prev.filter((key) => validKeys.has(key));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [explorerItems]);

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

  const renameBuffer = useCallback(
    async (oldName, newName) => {
      if (!unsavedDir) return;
      const existing = await opfsRead(oldName, unsavedDir);
      if (existing !== null) {
        await opfsWrite(newName, existing, unsavedDir);
        await opfsDelete(oldName, unsavedDir);
      }
    },
    [unsavedDir, opfsDelete, opfsRead, opfsWrite],
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
      setStatusMessage('');
      setSelectedEntries([]);
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
      setStatusMessage('');
      setSelectedEntries([]);
    } catch {}
  };

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
      setSelectedEntries([`file:${file.name}`]);
    },
    [loadBuffer, opfsSupported],
  );

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

  const openDir = useCallback(
    async (dir) => {
      setDirHandle(dir.handle);
      setPath((p) => [...p, { name: dir.name, handle: dir.handle }]);
      await readDir(dir.handle);
      setLocationError(null);
      setStatusMessage('');
      setSelectedEntries([]);
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
    setStatusMessage('');
    setSelectedEntries([]);
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
      setStatusMessage('');
      setSelectedEntries([]);
    }
  };

  const handleSelectionChange = useCallback((keys) => {
    setSelectedEntries(Array.from(keys));
  }, []);

  const handleOpenEntry = useCallback(
    (entry) => {
      if (entry.kind === 'directory') {
        openDir({ name: entry.name, handle: entry.handle });
      } else {
        openFile({ name: entry.name, handle: entry.handle });
      }
    },
    [openDir, openFile],
  );

  const handleRenameEntry = useCallback(
    async (entry, nextName) => {
      if (!dirHandle) throw new Error('No directory is currently open.');
      const trimmed = nextName.trim();
      if (!trimmed) throw new Error('Name cannot be empty.');
      if (trimmed === entry.name) return;
      setStatusMessage('');
      try {
        if (typeof dirHandle.renameEntry === 'function') {
          await dirHandle.renameEntry(entry.name, trimmed);
        } else if (entry.kind === 'file') {
          const exists = await dirHandle
            .getFileHandle(trimmed)
            .then(() => true)
            .catch(() => false);
          if (exists) throw new Error('An item with that name already exists.');
          const original = await entry.handle.getFile();
          const newHandle = await dirHandle.getFileHandle(trimmed, { create: true });
          const writable = await newHandle.createWritable();
          await writable.write(await original.arrayBuffer());
          await writable.close();
          await dirHandle.removeEntry(entry.name);
        } else {
          throw new Error('Folder rename is not supported in this browser.');
        }
        await renameBuffer(entry.name, trimmed);
        if (currentFile?.name === entry.name) {
          setCurrentFile((prev) => (prev ? { ...prev, name: trimmed } : prev));
        }
        await readDir(dirHandle);
        setSelectedEntries((prev) =>
          prev.map((key) => (key === entry.key ? `${entry.kind}:${trimmed}` : key)),
        );
        setStatusMessage(`Renamed ${entry.name} to ${trimmed}.`);
      } catch (error) {
        const message = error?.message || 'Rename failed.';
        setStatusMessage(message);
        throw new Error(message);
      }
    },
    [currentFile, dirHandle, readDir, renameBuffer],
  );

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
          aria-label="Upload file"
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
        {statusMessage && !locationError && (
          <div className="text-xs text-orange-200" role="status">
            {statusMessage}
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
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-gray-700 bg-black/20">
            <ExplorerView
              items={explorerItems}
              selectedKeys={selectedEntrySet}
              onSelectionChange={handleSelectionChange}
              onOpenItem={handleOpenEntry}
              onRenameItem={handleRenameEntry}
              emptyLabel="This location has no files or folders."
            />
          </div>
          {currentFile && (
            <textarea
              className="flex-1 p-2 bg-ub-cool-grey outline-none"
              value={content}
              onChange={onChange}
              aria-label={`Contents of ${currentFile.name}`}
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
    </div>
  );
}
