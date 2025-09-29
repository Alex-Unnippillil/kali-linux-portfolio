"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const [draggingFile, setDraggingFile] = useState(null);
  const [dropActive, setDropActive] = useState(false);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const instructionsId = useMemo(
    () => `file-explorer-delete-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );
  const liveRegionId = useMemo(
    () => `file-explorer-live-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

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

  const announce = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setStatusMessage(`${message} (${timestamp})`);
  }, []);

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
    [opfsWrite, unsavedDir],
  );

  const loadBuffer = useCallback(
    async (name) => {
      if (!unsavedDir) return null;
      return await opfsRead(name, unsavedDir);
    },
    [opfsRead, unsavedDir],
  );

  const removeBuffer = useCallback(
    async (name) => {
      if (unsavedDir) await opfsDelete(name, unsavedDir);
    },
    [opfsDelete, unsavedDir],
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
      announce(`${currentFile.name} saved.`);
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

  const handleFileDragStart = useCallback((event, entry) => {
    if (!entry?.handle || entry.handle.kind !== 'file') return;
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return;
    dataTransfer.setData('text/plain', entry.name);
    dataTransfer.setData('application/x-kali-file', entry.name);
    dataTransfer.effectAllowed = 'move';
    setDraggingFile(entry);
    setDropActive(false);
  }, []);

  const handleFileDragEnd = useCallback(() => {
    setDraggingFile(null);
    setDropActive(false);
  }, []);

  const handleFileDelete = useCallback(
    async (entry) => {
      if (!entry || !dirHandle) return;
      if (!entry.handle || entry.handle.kind !== 'file') {
        announce(`Only files can be removed. ${entry.name} is a folder.`);
        return;
      }
      try {
        const fileObj = await entry.handle.getFile();
        const buffer = await fileObj.arrayBuffer();
        await dirHandle.removeEntry(entry.name);
        if (currentFile?.name === entry.name) {
          setCurrentFile(null);
          setContent('');
        }
        if (opfsSupported) await removeBuffer(entry.name);
        await readDir(dirHandle);
        setLastDeleted({
          name: entry.name,
          data: buffer,
          type: fileObj.type,
          directory: dirHandle,
        });
        announce(`${entry.name} deleted. Undo available.`);
      } catch (error) {
        console.error('Failed to delete file', error);
        announce(`Failed to delete ${entry.name}.`);
      }
    },
    [announce, currentFile, dirHandle, opfsSupported, readDir, removeBuffer],
  );

  const handleDropZoneDragOver = useCallback(
    (event) => {
      if (!draggingFile) return;
      event.preventDefault();
      const dataTransfer = event.dataTransfer;
      if (dataTransfer) dataTransfer.dropEffect = 'move';
      setDropActive(true);
    },
    [draggingFile],
  );

  const handleDropZoneDragEnter = useCallback(
    (event) => {
      if (!draggingFile) return;
      event.preventDefault();
      setDropActive(true);
    },
    [draggingFile],
  );

  const handleDropZoneDragLeave = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDropActive(false);
  }, []);

  const handleDropZoneDrop = useCallback(
    async (event) => {
      event.preventDefault();
      if (!draggingFile) return;
      await handleFileDelete(draggingFile);
      setDraggingFile(null);
      setDropActive(false);
    },
    [draggingFile, handleFileDelete],
  );

  const handleUndoDelete = useCallback(async () => {
    if (!lastDeleted) return;
    try {
      const targetDir = lastDeleted.directory || dirHandle;
      if (!targetDir) return;
      const fileHandle = await targetDir.getFileHandle(lastDeleted.name, { create: true });
      const writable = await fileHandle.createWritable();
      const blob = new Blob([lastDeleted.data], {
        type: lastDeleted.type || 'application/octet-stream',
      });
      await writable.write(blob);
      await writable.close();
      await readDir(targetDir);
      announce(`${lastDeleted.name} restored.`);
      setLastDeleted(null);
    } catch (error) {
      console.error('Failed to restore file', error);
      announce(`Unable to restore ${lastDeleted?.name || 'file'}.`);
    }
  }, [announce, dirHandle, lastDeleted, readDir]);

  useEffect(() => {
    if (!lastDeleted) return;
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndoDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndoDelete, lastDeleted]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  if (!supported) {
    return (
      <div className="p-4 flex flex-col h-full">
        <p id={instructionsId} className="mb-2 text-xs text-gray-300">
          Keyboard: Focus the file view and press Delete to remove it. Press Ctrl+Z to undo deletions.
        </p>
        <div id={liveRegionId} className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
        <input
          ref={fallbackInputRef}
          type="file"
          onChange={openFallback}
          className="hidden"
          aria-label="Select file to open"
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
      <div className="px-4 py-2 text-xs text-gray-300" id={instructionsId}>
        Drag files into the delete zone or focus a file and press Delete to remove it. Press Ctrl+Z to undo.
      </div>
      <div id={liveRegionId} className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>
      {lastDeleted && (
        <div
          className="mx-4 flex items-center justify-between rounded bg-black/40 px-3 py-2 text-xs text-gray-100"
          role="status"
          aria-live="polite"
        >
          <span>{lastDeleted.name} deleted. Press Ctrl+Z or use Undo to restore.</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="rounded bg-sky-500 px-2 py-1 text-white hover:bg-sky-400 focus:outline-none focus-visible:ring focus-visible:ring-sky-300"
          >
            Undo
          </button>
        </div>
      )}
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
            <button
              key={i}
              type="button"
              className="flex w-full cursor-pointer px-2 py-1 text-left hover:bg-black hover:bg-opacity-30 focus:outline-none focus-visible:ring focus-visible:ring-sky-400"
              onClick={() => openFile(f)}
              draggable
              onDragStart={(event) => handleFileDragStart(event, f)}
              onDragEnd={handleFileDragEnd}
              onKeyDown={(event) => {
                if (event.key === 'Delete' || event.key === 'Backspace') {
                  event.preventDefault();
                  handleFileDelete(f);
                }
              }}
              aria-describedby={instructionsId}
            >
              {f.name}
            </button>
          ))}
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
              aria-label="Search text in files"
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
      <div
        className={`mx-4 my-4 rounded border-2 border-dashed px-4 py-3 text-center text-xs transition focus:outline-none focus-visible:ring focus-visible:ring-red-300 ${
          dropActive ? 'border-red-400 bg-red-500/20 text-white' : 'border-gray-500 text-gray-200'
        }`}
        onDragEnter={handleDropZoneDragEnter}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
        role="region"
        aria-live="polite"
        aria-describedby={instructionsId}
        aria-label="File deletion drop zone"
      >
        <p className="font-medium">Drag files here to delete them.</p>
        <p className="mt-1">
          Keyboard: Focus a file and press Delete to remove it. Press Ctrl+Z to undo.
        </p>
      </div>
    </div>
  );
}
