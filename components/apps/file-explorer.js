"use client";

import React, { useState, useEffect, useRef } from 'react';
import useOPFS from '../../hooks/useOPFS';
import useUndoQueue from '../../hooks/useUndoQueue';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import Toast from '../ui/Toast';

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
  const { entries: undoEntries, enqueue: enqueueUndo, undo: undoAction, remove: removeUndo } =
    useUndoQueue();
  const [pendingUndo, setPendingUndo] = useState(null);
  const [statusToast, setStatusToast] = useState('');
  const dirRef = useRef(null);

  useEffect(() => {
    dirRef.current = dirHandle;
  }, [dirHandle]);

  useEffect(() => {
    if (!undoEntries.length) {
      setPendingUndo(null);
      return;
    }
    const latest = undoEntries[undoEntries.length - 1];
    setPendingUndo(latest);
  }, [undoEntries]);

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

  const currentPathLabel = () => {
    const names = path.map((segment) => segment.name || '').filter(Boolean);
    if (!names.length) return '/';
    const segments = names[0] === '/' ? names.slice(1) : names;
    const joined = segments.join('/');
    return joined ? `/${joined}` : names[0] === '/' ? '/' : `/${names[0]}`;
  };

  const handleUndo = async (entry) => {
    const success = await undoAction(entry.id);
    if (success) {
      setStatusToast(`${entry.metadata.fileName} restored`);
    } else {
      setStatusToast(`Failed to restore ${entry.metadata.fileName}`);
    }
  };

  const deleteFileEntry = async (file) => {
    if (!dirHandle) return;
    if (typeof window !== 'undefined' && !window.confirm(`Delete ${file.name}?`)) return;

    try {
      const directory = dirHandle;
      const fileHandle = file.handle;
      const fileData = await fileHandle.getFile();
      const buffer = await fileData.arrayBuffer();
      const blob = new Blob([buffer], { type: fileData.type || 'application/octet-stream' });
      const size = fileData.size;
      const pathLabel = currentPathLabel();

      await directory.removeEntry(file.name);
      if (currentFile?.name === file.name) {
        setCurrentFile(null);
        setContent('');
      }
      if (opfsSupported) await removeBuffer(file.name);
      await readDir(directory);

      setStatusToast('');
      enqueueUndo({
        type: 'file-delete',
        metadata: {
          fileName: file.name,
          path: pathLabel,
          size,
          mimeType: fileData.type,
        },
        undo: async () => {
          const restoredHandle = await directory.getFileHandle(file.name, { create: true });
          const writable = await restoredHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          if (dirRef.current === directory) {
            await readDir(directory);
          }
        },
      });
    } catch (error) {
      console.error('Failed to delete file', error);
      setStatusToast(`Failed to delete ${file.name}`);
    }
  };

  const undoDuration = pendingUndo ? Math.max(pendingUndo.expiresAt - Date.now(), 0) : 0;

  const toastElements = (
    <>
      {pendingUndo && (
        <Toast
          key={pendingUndo.id}
          message={`Deleted ${pendingUndo.metadata.fileName}`}
          actionLabel="Undo"
          onAction={() => handleUndo(pendingUndo)}
          onClose={() => removeUndo(pendingUndo.id)}
          duration={Math.max(undoDuration, 1000)}
        />
      )}
      {statusToast && (
        <Toast
          key="file-explorer-status"
          message={statusToast}
          onClose={() => setStatusToast('')}
          duration={4000}
        />
      )}
    </>
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
      <>
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
        {toastElements}
      </>
    );
  }

  return (
    <>
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
              key={`${f.name}-${i}`}
              className="px-2 py-0.5 cursor-pointer hover:bg-black hover:bg-opacity-30 flex items-center justify-between"
              onClick={() => openFile(f)}
            >
              <span className="truncate">{f.name}</span>
              <button
                className="ml-2 text-xs px-1 py-0.5 bg-red-600 bg-opacity-70 rounded hover:bg-opacity-90"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFileEntry(f);
                }}
              >
                Delete
              </button>
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
      {toastElements}
    </>
  );
}
