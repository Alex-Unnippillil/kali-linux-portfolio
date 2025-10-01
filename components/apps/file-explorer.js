"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import ContextMenu from '../common/ContextMenu';

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
  const contextTargetRef = useRef(null);
  const renameInputRef = useRef(null);
  const [contextSelection, setContextSelection] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [undoInfo, setUndoInfo] = useState(null);

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
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

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

  const handleContextMenuCapture = (e) => {
    const target = e.target instanceof HTMLElement ? e.target.closest('[data-entry]') : null;
    if (!target) {
      setContextSelection(null);
    }
  };

  const handleKeyDownCapture = (e) => {
    if (e.shiftKey && e.key === 'F10') {
      if (focusedItem) {
        setContextSelection(focusedItem);
      } else {
        setContextSelection(null);
      }
    }
  };

  const beginRename = (entry, type) => {
    setRenaming({ entry, type });
    setRenameValue(entry?.name ?? '');
  };

  const cancelRename = () => {
    setRenaming(null);
    setRenameValue('');
  };

  const submitRename = async () => {
    if (!renaming || !dirHandle) {
      cancelRename();
      return;
    }
    const newName = renameValue.trim();
    const originalName = renaming.entry?.name;
    if (!newName || newName === originalName) {
      cancelRename();
      return;
    }
    try {
      const newHandle = await renameEntryHandle(dirHandle, renaming.entry, newName);
      if (unsavedDir && renaming.type === 'file') {
        const buffer = await opfsRead(originalName, unsavedDir);
        if (buffer !== null) {
          await opfsWrite(newName, buffer, unsavedDir);
          await opfsDelete(originalName, unsavedDir);
        }
      }
      if (currentFile?.name === originalName && renaming.type === 'file') {
        setCurrentFile({ ...currentFile, name: newName, handle: newHandle });
      }
      await readDir(dirHandle);
      setContextSelection({ entry: { name: newName, handle: newHandle }, type: renaming.type });
      setLocationError(null);
      cancelRename();
    } catch (err) {
      const message = err?.message || `Unable to rename ${originalName}`;
      setLocationError(message);
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  const ensureUniqueName = async (baseName) => {
    if (!dirHandle) return baseName;
    const existing = new Set([...dirs, ...files].map((entry) => entry.name));
    let candidate = baseName;
    let counter = 1;
    while (existing.has(candidate)) {
      candidate = `${baseName} ${counter}`;
      counter += 1;
    }
    return candidate;
  };

  const createFolder = async () => {
    if (!dirHandle) return;
    try {
      const uniqueName = await ensureUniqueName('New Folder');
      const newHandle = await dirHandle.getDirectoryHandle(uniqueName, { create: true });
      await readDir(dirHandle);
      const newEntry = { name: uniqueName, handle: newHandle };
      setContextSelection({ entry: newEntry, type: 'directory' });
      beginRename(newEntry, 'directory');
      setLocationError(null);
    } catch (err) {
      setLocationError(err?.message || 'Unable to create folder');
    }
  };

  const confirmDeleteEntry = (entry, type) => {
    setConfirmDelete({ entry, type });
  };

  const performDelete = async () => {
    if (!confirmDelete || !dirHandle) {
      setConfirmDelete(null);
      return;
    }
    const { entry, type } = confirmDelete;
    try {
      if (undoInfo && unsavedDir) {
        await opfsDelete(undoInfo.bufferName, unsavedDir);
      }
      setUndoInfo(null);
      let snapshot = null;
      if (unsavedDir) {
        snapshot = await serializeEntry(entry);
      }
      const bufferName = snapshot ? `deleted-${Date.now()}-${entry.name}.json` : null;
      if (snapshot && unsavedDir && bufferName) {
        await opfsWrite(bufferName, JSON.stringify(snapshot), unsavedDir);
      }
      await dirHandle.removeEntry(entry.name, { recursive: type === 'directory' });
      if (currentFile?.name === entry.name && type === 'file') {
        setCurrentFile(null);
        setContent('');
      }
      await readDir(dirHandle);
      if (bufferName && unsavedDir && snapshot) {
        setUndoInfo({ bufferName, parent: dirHandle, originalName: entry.name });
      }
      setContextSelection(null);
      setLocationError(null);
    } catch (err) {
      setLocationError(err?.message || `Unable to delete ${confirmDelete.entry.name}`);
    } finally {
      setConfirmDelete(null);
    }
  };

  const undoDelete = async () => {
    if (!undoInfo || !unsavedDir) return;
    try {
      const raw = await opfsRead(undoInfo.bufferName, unsavedDir);
      if (!raw) {
        setUndoInfo(null);
        return;
      }
      const snapshot = JSON.parse(raw);
      await restoreSerializedEntry(snapshot, undoInfo.parent);
      await opfsDelete(undoInfo.bufferName, unsavedDir);
      await readDir(undoInfo.parent);
      setUndoInfo(null);
      setLocationError(null);
    } catch (err) {
      setLocationError(err?.message || 'Unable to undo delete');
    }
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

  const contextMenuItems = [
    ...(contextSelection
      ? [
          {
            label: 'Rename',
            onSelect: () => beginRename(contextSelection.entry, contextSelection.type),
          },
          {
            label: 'Delete',
            onSelect: () => confirmDeleteEntry(contextSelection.entry, contextSelection.type),
          },
        ]
      : []),
    { label: 'New Folder', onSelect: createFolder },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm relative">
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
          ref={contextTargetRef}
          onContextMenuCapture={handleContextMenuCapture}
          onKeyDownCapture={handleKeyDownCapture}
          className="w-40 overflow-auto border-r border-gray-600"
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
          {dirs.map((d, i) => {
            const isRenaming = renaming?.entry?.handle === d.handle;
            if (isRenaming) {
              const inputId = `rename-dir-${i}`;
              return (
                <div key={`dir-${i}`} className="px-2 py-1">
                  <label htmlFor={inputId} className="sr-only">
                    Rename directory {d.name}
                  </label>
                  <input
                    id={inputId}
                    ref={renameInputRef}
                    data-entry="directory"
                    type="text"
                    aria-label={`Rename directory ${d.name}`}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={submitRename}
                    onKeyDown={handleRenameKeyDown}
                    className="w-full px-2 py-1 text-black"
                  />
                </div>
              );
            }
            return (
              <button
                key={`dir-${i}`}
                type="button"
                data-entry="directory"
                className="w-full text-left px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-30 focus:outline-none focus:bg-black focus:bg-opacity-30"
                onClick={() => openDir(d)}
                onContextMenu={() => {
                  setContextSelection({ entry: d, type: 'directory' });
                  setFocusedItem({ entry: d, type: 'directory' });
                }}
                onFocus={() => setFocusedItem({ entry: d, type: 'directory' })}
                onBlur={() => setFocusedItem(null)}
              >
                {d.name}
              </button>
            );
          })}
          <div className="p-2 font-bold">Files</div>
          {files.map((f, i) => {
            const isRenaming = renaming?.entry?.handle === f.handle;
            if (isRenaming) {
              const inputId = `rename-file-${i}`;
              return (
                <div key={`file-${i}`} className="px-2 py-1">
                  <label htmlFor={inputId} className="sr-only">
                    Rename file {f.name}
                  </label>
                  <input
                    id={inputId}
                    ref={renameInputRef}
                    data-entry="file"
                    type="text"
                    aria-label={`Rename file ${f.name}`}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={submitRename}
                    onKeyDown={handleRenameKeyDown}
                    className="w-full px-2 py-1 text-black"
                  />
                </div>
              );
            }
            return (
              <button
                key={`file-${i}`}
                type="button"
                data-entry="file"
                className="w-full text-left px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-30 focus:outline-none focus:bg-black focus:bg-opacity-30"
                onClick={() => openFile(f)}
                onContextMenu={() => {
                  setContextSelection({ entry: f, type: 'file' });
                  setFocusedItem({ entry: f, type: 'file' });
                }}
                onFocus={() => setFocusedItem({ entry: f, type: 'file' })}
                onBlur={() => setFocusedItem(null)}
              >
                {f.name}
              </button>
            );
          })}
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
              aria-label="Find in files"
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
      {undoInfo && (
        <div
          role="status"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 px-4 py-2 rounded flex items-center space-x-3 z-30"
        >
          <span>
            Deleted &ldquo;{undoInfo.originalName}&rdquo;
          </span>
          <button
            type="button"
            className="px-2 py-1 bg-ub-warm-grey rounded text-black"
            onClick={undoDelete}
          >
            Undo
          </button>
        </div>
      )}
      {confirmDelete && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="file-explorer-delete-title"
            aria-describedby="file-explorer-delete-desc"
            className="bg-ub-warm-grey text-white p-4 rounded shadow-lg max-w-sm w-72"
          >
            <h2 id="file-explorer-delete-title" className="text-lg font-semibold">
              Delete &ldquo;{confirmDelete.entry.name}&rdquo;?
            </h2>
            <p id="file-explorer-delete-desc" className="text-xs mt-2 text-gray-200">
              The item will be moved to a temporary buffer so it can be restored while this window remains open.
            </p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                className="px-3 py-1 rounded bg-black bg-opacity-40"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded bg-red-600"
                onClick={performDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <ContextMenu targetRef={contextTargetRef} items={contextMenuItems} />
    </div>
  );
}

async function entryExists(parentHandle, name) {
  for await (const [existingName] of parentHandle.entries()) {
    if (existingName === name) return true;
  }
  return false;
}

async function copyDirectoryRecursive(source, target) {
  for await (const [name, handle] of source.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile();
      const newFile = await target.getFileHandle(name, { create: true });
      const writable = await newFile.createWritable();
      await writable.write(file);
      await writable.close();
    } else if (handle.kind === 'directory') {
      const child = await target.getDirectoryHandle(name, { create: true });
      await copyDirectoryRecursive(handle, child);
    }
  }
}

export async function renameEntryHandle(parentHandle, entry, newName) {
  if (!parentHandle || !entry?.handle) {
    throw new Error('Invalid entry');
  }
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('Name cannot be empty');
  }
  if (/[\\/]/.test(trimmed)) {
    throw new Error('Name cannot contain slashes');
  }
  if (entry.name === trimmed) {
    return entry.handle;
  }
  if (await entryExists(parentHandle, trimmed)) {
    throw new Error(`${trimmed} already exists`);
  }
  if (entry.handle.kind === 'file') {
    const newHandle = await parentHandle.getFileHandle(trimmed, { create: true });
    try {
      const file = await entry.handle.getFile();
      const writable = await newHandle.createWritable();
      await writable.write(file);
      await writable.close();
      await parentHandle.removeEntry(entry.name);
      return newHandle;
    } catch (err) {
      await parentHandle.removeEntry(trimmed).catch(() => {});
      throw err;
    }
  }
  if (entry.handle.kind === 'directory') {
    const newDir = await parentHandle.getDirectoryHandle(trimmed, { create: true });
    try {
      await copyDirectoryRecursive(entry.handle, newDir);
      await parentHandle.removeEntry(entry.name, { recursive: true });
      return newDir;
    } catch (err) {
      await parentHandle.removeEntry(trimmed, { recursive: true }).catch(() => {});
      throw err;
    }
  }
  throw new Error('Unsupported entry type');
}

export async function serializeEntry(entry) {
  if (!entry?.handle) return null;
  if (entry.handle.kind === 'file') {
    const file = await entry.handle.getFile();
    const buffer = await file.arrayBuffer();
    return {
      type: 'file',
      name: entry.name,
      data: bufferToBase64(buffer),
      encoding: 'base64',
    };
  }
  if (entry.handle.kind === 'directory') {
    const entries = [];
    for await (const [name, handle] of entry.handle.entries()) {
      const child = await serializeEntry({ name, handle });
      if (child) entries.push(child);
    }
    return {
      type: 'directory',
      name: entry.name,
      entries,
    };
  }
  return null;
}

export async function restoreSerializedEntry(snapshot, parentHandle) {
  if (!snapshot || !parentHandle) return;
  if (snapshot.type === 'file') {
    const fileHandle = await parentHandle.getFileHandle(snapshot.name, { create: true });
    const writable = await fileHandle.createWritable();
    if (snapshot.encoding === 'base64') {
      const bytes = base64ToBuffer(snapshot.data ?? '');
      await writable.write(bytes);
    } else {
      await writable.write(snapshot.data ?? '');
    }
    await writable.close();
    return;
  }
  if (snapshot.type === 'directory') {
    const dirHandle = await parentHandle.getDirectoryHandle(snapshot.name, { create: true });
    for (const child of snapshot.entries || []) {
      await restoreSerializedEntry(child, dirHandle);
    }
  }
}

function bufferToBase64(buffer) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  const uint = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < uint.length; i += 1) {
    binary += String.fromCharCode(uint[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  throw new Error('Base64 encoding not supported in this environment');
}

function base64ToBuffer(base64) {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('Base64 decoding not supported in this environment');
}
