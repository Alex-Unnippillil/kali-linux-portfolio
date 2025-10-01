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

const ORDER_FILE = '.order.json';

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

const isCopyModifier = (event) => event.ctrlKey || event.metaKey || event.altKey;

const createGhostPreview = (text) => {
  if (typeof document === 'undefined') return null;
  const ghost = document.createElement('div');
  ghost.textContent = text;
  ghost.style.position = 'fixed';
  ghost.style.top = '-9999px';
  ghost.style.left = '-9999px';
  ghost.style.padding = '4px 8px';
  ghost.style.fontSize = '12px';
  ghost.style.borderRadius = '4px';
  ghost.style.background = 'rgba(0, 0, 0, 0.7)';
  ghost.style.color = '#fff';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '9999';
  document.body.appendChild(ghost);
  return ghost;
};

const ORDER_DEFAULT = { dirs: [], files: [] };

const normaliseOrder = (order) => {
  if (!order || typeof order !== 'object') return { ...ORDER_DEFAULT };
  const dirs = Array.isArray(order.dirs) ? order.dirs.filter(Boolean) : [];
  const files = Array.isArray(order.files) ? order.files.filter(Boolean) : [];
  return { dirs, files };
};

const reorderItems = (list, fromIndex, toIndex) => {
  if (fromIndex === toIndex) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
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
  const dragStateRef = useRef(null);
  const dragImageRef = useRef(null);
  const [dragHover, setDragHover] = useState({ type: null, index: -1 });

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

  const readOrder = useCallback(async (handle) => {
    if (!handle) return ORDER_DEFAULT;
    try {
      const orderHandle = await handle.getFileHandle(ORDER_FILE);
      const file = await orderHandle.getFile();
      const text = await file.text();
      return normaliseOrder(JSON.parse(text));
    } catch {
      return ORDER_DEFAULT;
    }
  }, []);

  const writeOrder = useCallback(async (handle, dirEntries = [], fileEntries = []) => {
    if (!handle) return;
    try {
      const orderHandle = await handle.getFileHandle(ORDER_FILE, { create: true });
      const writable = await orderHandle.createWritable();
      const data = JSON.stringify({
        dirs: dirEntries.map((entry) => entry.name),
        files: fileEntries.map((entry) => entry.name),
      });
      await writable.write(data);
      await writable.close();
    } catch {}
  }, []);

  const mutateOrder = useCallback(
    async (handle, updater) => {
      if (!handle) return;
      try {
        const current = await readOrder(handle);
        const next = normaliseOrder(updater({ ...current }));
        await writeOrder(
          handle,
          next.dirs.map((name) => ({ name })),
          next.files.map((name) => ({ name })),
        );
      } catch {}
    },
    [readOrder, writeOrder],
  );

  const readDir = useCallback(async (handle) => {
    const ds = [];
    const fs = [];
    for await (const [name, h] of handle.entries()) {
      if (name === ORDER_FILE) continue;
      if (h.kind === 'file') fs.push({ name, handle: h });
      else if (h.kind === 'directory') ds.push({ name, handle: h });
    }
    const order = await readOrder(handle);
    const dirOrderMap = new Map(order.dirs.map((entry, index) => [entry, index]));
    const fileOrderMap = new Map(order.files.map((entry, index) => [entry, index]));
    ds.sort((a, b) => {
      const ai = dirOrderMap.has(a.name) ? dirOrderMap.get(a.name) : Number.MAX_SAFE_INTEGER;
      const bi = dirOrderMap.has(b.name) ? dirOrderMap.get(b.name) : Number.MAX_SAFE_INTEGER;
      if (ai === bi) return a.name.localeCompare(b.name);
      return ai - bi;
    });
    fs.sort((a, b) => {
      const ai = fileOrderMap.has(a.name) ? fileOrderMap.get(a.name) : Number.MAX_SAFE_INTEGER;
      const bi = fileOrderMap.has(b.name) ? fileOrderMap.get(b.name) : Number.MAX_SAFE_INTEGER;
      if (ai === bi) return a.name.localeCompare(b.name);
      return ai - bi;
    });
    setDirs(ds);
    setFiles(fs);
    const dirNames = ds.map((entry) => entry.name);
    const fileNames = fs.map((entry) => entry.name);
    if (
      dirNames.length !== order.dirs.length ||
      dirNames.some((name, idx) => order.dirs[idx] !== name) ||
      fileNames.length !== order.files.length ||
      fileNames.some((name, idx) => order.files[idx] !== name)
    ) {
      await writeOrder(handle, ds, fs);
    }
  }, [readOrder, writeOrder]);

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

  useEffect(() => () => workerRef.current?.terminate(), []);

  const handleDragStart = (event, entry, type, index) => {
    event.stopPropagation();
    if (!event.dataTransfer) return;
    dragStateRef.current = {
      type,
      name: entry.name,
      handle: entry.handle,
      sourceDir: dirHandle,
      index,
    };
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('text/plain', entry.name);
    const ghost = createGhostPreview(entry.name);
    if (ghost) {
      dragImageRef.current = ghost;
      const rect = ghost.getBoundingClientRect();
      event.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
      setTimeout(() => {
        if (dragImageRef.current === ghost) {
          ghost.remove();
          dragImageRef.current = null;
        }
      }, 0);
    }
  };

  const clearDragState = () => {
    dragStateRef.current = null;
    setDragHover({ type: null, index: -1 });
  };

  const handleDragEnd = () => {
    clearDragState();
  };

  const handleReorder = async (type, targetIndex) => {
    const state = dragStateRef.current;
    if (!state || state.type !== type || state.sourceDir !== dirHandle) return false;
    const list = type === 'dir' ? dirs : files;
    if (!list[state.index] || targetIndex < 0 || targetIndex > list.length) return false;
    const updated = reorderItems(list, state.index, targetIndex);
    if (type === 'dir') setDirs(updated);
    else setFiles(updated);
    await writeOrder(dirHandle, type === 'dir' ? updated : dirs, type === 'file' ? updated : files);
    clearDragState();
    return true;
  };

  const copyDirectoryRecursive = useCallback(
    async (source, destination, name) => {
      const destDir = await destination.getDirectoryHandle(name, { create: true });
      for await (const [entryName, entryHandle] of source.entries()) {
        if (entryName === ORDER_FILE) continue;
        if (entryHandle.kind === 'file') {
          try {
            const file = await entryHandle.getFile();
            await opfsWrite(entryName, file, destDir);
          } catch {}
        } else if (entryHandle.kind === 'directory') {
          await copyDirectoryRecursive(entryHandle, destDir, entryName);
        }
      }
      return destDir;
    },
    [opfsWrite],
  );

  const handleMoveOrCopy = useCallback(
    async (state, destination, copy) => {
      if (!state || !destination) return;
      if (destination === state.sourceDir && state.type === 'dir') return;
      try {
        if (state.type === 'file') {
          const file = await state.handle.getFile();
          await opfsWrite(state.name, file, destination);
        } else {
          await copyDirectoryRecursive(state.handle, destination, state.name);
        }
        if (!copy && state.sourceDir) {
          await mutateOrder(state.sourceDir, (order) => {
            if (state.type === 'dir') {
              order.dirs = order.dirs.filter((name) => name !== state.name);
            } else {
              order.files = order.files.filter((name) => name !== state.name);
            }
            return order;
          });
          await state.sourceDir.removeEntry(state.name, {
            recursive: state.type === 'dir',
          });
        }
        await mutateOrder(destination, (order) => {
          if (state.type === 'dir') {
            order.dirs = order.dirs.filter((name) => name !== state.name);
            order.dirs.push(state.name);
          } else {
            order.files = order.files.filter((name) => name !== state.name);
            order.files.push(state.name);
          }
          return order;
        });
        await readDir(dirHandle);
      } catch {}
    },
    [copyDirectoryRecursive, dirHandle, mutateOrder, opfsWrite, readDir],
  );

  const handleDirectoryDrop = async (event, entry, index) => {
    event.preventDefault();
    const state = dragStateRef.current;
    const copy = isCopyModifier(event);
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    if (state && state.sourceDir === dirHandle && state.type === 'dir') {
      const targetIndex = before ? index : index + 1;
      const handled = await handleReorder('dir', targetIndex);
      if (!handled && entry?.handle && state.handle !== entry.handle) {
        await handleMoveOrCopy(state, entry.handle, copy);
      }
    } else if (state && entry?.handle && state.handle !== entry.handle) {
      await handleMoveOrCopy(state, entry.handle, copy);
    }
    clearDragState();
  };

  const handleFileDrop = async (event, index) => {
    event.preventDefault();
    const state = dragStateRef.current;
    const before = (() => {
      const rect = event.currentTarget.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2;
    })();
    if (state && state.sourceDir === dirHandle && state.type === 'file') {
      const targetIndex = before ? index : index + 1;
      await handleReorder('file', targetIndex);
    }
    clearDragState();
  };

  const handleContainerDrop = async (event) => {
    event.preventDefault();
    const state = dragStateRef.current;
    if (event.dataTransfer?.files && event.dataTransfer.files.length) {
      for (const file of event.dataTransfer.files) {
        await opfsWrite(file.name, file, dirHandle);
        await mutateOrder(dirHandle, (order) => {
          order.files = order.files.filter((name) => name !== file.name);
          order.files.push(file.name);
          return order;
        });
      }
      await readDir(dirHandle);
    } else if (state) {
      const copy = isCopyModifier(event);
      await handleMoveOrCopy(state, dirHandle, copy);
    }
    clearDragState();
  };

  const handleDragOverContainer = (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isCopyModifier(event) ? 'copy' : 'move';
    }
  };

  const handleDragOverItem = (event, type, index) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isCopyModifier(event) ? 'copy' : 'move';
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    const targetIndex = before ? index : index + 1;
    setDragHover({ type, index: targetIndex });
  };

  const handleExternalDragEnter = (event) => {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isCopyModifier(event) ? 'copy' : 'move';
    }
  };

  const handleDirectoryListDragOver = (event) => {
    handleDragOverContainer(event);
    const state = dragStateRef.current;
    if (state && state.sourceDir === dirHandle && state.type === 'dir') {
      setDragHover({ type: 'dir', index: dirs.length });
    }
  };

  const handleFileListDragOver = (event) => {
    handleDragOverContainer(event);
    const state = dragStateRef.current;
    if (state && state.sourceDir === dirHandle && state.type === 'file') {
      setDragHover({ type: 'file', index: files.length });
    }
  };

  const handleDirectoryListDrop = async (event) => {
    event.preventDefault();
    const state = dragStateRef.current;
    if (state && state.sourceDir === dirHandle && state.type === 'dir') {
      await handleReorder('dir', dirs.length);
      clearDragState();
      return;
    }
    await handleContainerDrop(event);
  };

  const handleFileListDrop = async (event) => {
    event.preventDefault();
    const state = dragStateRef.current;
    if (state && state.sourceDir === dirHandle && state.type === 'file') {
      await handleReorder('file', files.length);
      clearDragState();
      return;
    }
    await handleContainerDrop(event);
  };

  if (!supported) {
    return (
      <div className="p-4 flex flex-col h-full">
        <input
          ref={fallbackInputRef}
          type="file"
          onChange={openFallback}
          className="hidden"
          aria-label="Select file"
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
            data-testid="directory-list"
            onDragOver={handleDirectoryListDragOver}
            onDrop={handleDirectoryListDrop}
            onDragEnter={handleExternalDragEnter}
          >
            {dirs.map((d, i) => (
              <button
                key={d.name}
                type="button"
                className={`px-2 w-full text-left cursor-pointer hover:bg-black hover:bg-opacity-30 flex items-center justify-between ${
                  dragHover.type === 'dir' && dragHover.index === i ? 'bg-black bg-opacity-30' : ''
                }`}
                draggable
                data-entry-type="dir"
                data-entry-name={d.name}
                onClick={() => openDir(d)}
                onDragStart={(event) => handleDragStart(event, d, 'dir', i)}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => handleDragOverItem(event, 'dir', i)}
                onDrop={(event) => handleDirectoryDrop(event, d, i)}
              >
                <span className="flex-1" data-testid="entry-name">
                  {d.name}
                </span>
                <span className="ml-2 text-xs text-gray-300 cursor-grab" title="Drag to reorder">
                  ≡
                </span>
              </button>
            ))}
            {dragHover.type === 'dir' && dragHover.index === dirs.length && (
              <div className="h-2 bg-blue-500 bg-opacity-60" />
            )}
          </div>
          <div className="p-2 font-bold">Files</div>
          <div
            data-testid="file-list"
            onDragOver={handleFileListDragOver}
            onDrop={handleFileListDrop}
            onDragEnter={handleExternalDragEnter}
          >
            {files.map((f, i) => (
              <button
                key={f.name}
                type="button"
                className={`px-2 w-full text-left cursor-pointer hover:bg-black hover:bg-opacity-30 flex items-center justify-between ${
                  dragHover.type === 'file' && dragHover.index === i ? 'bg-black bg-opacity-30' : ''
                }`}
                draggable
                data-entry-type="file"
                data-entry-name={f.name}
                onClick={() => openFile(f)}
                onDragStart={(event) => handleDragStart(event, f, 'file', i)}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => handleDragOverItem(event, 'file', i)}
                onDrop={(event) => handleFileDrop(event, i)}
              >
                <span className="flex-1" data-testid="entry-name">
                  {f.name}
                </span>
                <span className="ml-2 text-xs text-gray-300 cursor-grab" title="Drag to reorder">
                  ≡
                </span>
              </button>
            ))}
            {dragHover.type === 'file' && dragHover.index === files.length && (
              <div className="h-2 bg-blue-500 bg-opacity-60" />
            )}
          </div>
        </div>
        <div
          className="flex-1 flex flex-col"
          onDrop={handleContainerDrop}
          onDragOver={handleDragOverContainer}
          onDragEnter={handleExternalDragEnter}
        >
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
              aria-label="Find in files"
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
