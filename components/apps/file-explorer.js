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
  const [permissionNeeded, setPermissionNeeded] = useState(false);

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

  const interpretAccessError = useCallback((error, fallback) => {
    if (!error) {
      return { message: fallback, requiresPermission: false };
    }
    const name = error?.name;
    if (name === 'AbortError') {
      return { message: 'Folder selection was cancelled.', requiresPermission: false };
    }
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return {
        message: 'Permission to access this location was denied. Use "Grant access" to try again.',
        requiresPermission: true,
      };
    }
    return { message: fallback, requiresPermission: false };
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    (async () => {
      setUnsavedDir(await getDir('unsaved'));
      setDirHandle(root);
      setPath([{ name: root.name || '/', handle: root }]);
      const success = await readDir(root);
      if (success) {
        setPermissionNeeded(false);
      }
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
      const success = await readDir(handle);
      if (!success) return;
      setDirHandle(handle);
      addRecentDir(handle);
      setRecent(await getRecentDirs());
      setPath([{ name: handle.name || '/', handle }]);
      setPermissionNeeded(false);
      setLocationError(null);
    } catch (error) {
      const { message, requiresPermission } = interpretAccessError(
        error,
        'Unable to open the selected folder.',
      );
      setPermissionNeeded(requiresPermission);
      setLocationError(message);
    }
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        setPermissionNeeded(true);
        setLocationError('Permission is required to open this folder again.');
        return;
      }
      const success = await readDir(entry.handle);
      if (!success) return;
      setDirHandle(entry.handle);
      setPath([{ name: entry.name, handle: entry.handle }]);
      setPermissionNeeded(false);
      setLocationError(null);
    } catch (error) {
      const { message, requiresPermission } = interpretAccessError(
        error,
        `Unable to open ${entry.name}.`,
      );
      setPermissionNeeded(requiresPermission);
      setLocationError(message);
    }
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

  const readDir = useCallback(
    async (handle) => {
      const ds = [];
      const fs = [];
      try {
        for await (const [name, h] of handle.entries()) {
          if (h.kind === 'file') fs.push({ name, handle: h });
          else if (h.kind === 'directory') ds.push({ name, handle: h });
        }
        setDirs(ds);
        setFiles(fs);
        return true;
      } catch (error) {
        setDirs([]);
        setFiles([]);
        const { message, requiresPermission } = interpretAccessError(
          error,
          'Unable to read the selected location.',
        );
        setPermissionNeeded(requiresPermission);
        setLocationError(message);
        return false;
      }
    },
    [interpretAccessError],
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
          const ok = await readDir(root);
          if (ok && active) {
            setPermissionNeeded(false);
            setLocationError(null);
          }
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
        const ok = await readDir(current);
        if (ok && active) {
          setPermissionNeeded(false);
          setLocationError(null);
        }
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
    const ok = await readDir(dir.handle);
    if (ok) {
      setPermissionNeeded(false);
      setLocationError(null);
    }
  };

  const navigateTo = async (index) => {
    const target = path[index];
    if (!target || !target.handle) return;
    setDirHandle(target.handle);
    setPath(path.slice(0, index + 1));
    const ok = await readDir(target.handle);
    if (ok) {
      setPermissionNeeded(false);
      setLocationError(null);
    }
  };

  const goBack = async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setPath(newPath);
    if (prev?.handle) {
      setDirHandle(prev.handle);
      const ok = await readDir(prev.handle);
      if (ok) {
        setPermissionNeeded(false);
        setLocationError(null);
      }
    }
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile.name);
    } catch (error) {
      const { message, requiresPermission } = interpretAccessError(
        error,
        `Unable to save ${currentFile.name}.`,
      );
      setPermissionNeeded(requiresPermission);
      setLocationError(message);
    }
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
          aria-label="Choose a file"
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

  const hasEntries = dirs.length > 0 || files.length > 0;
  const emptyState = (() => {
    if (permissionNeeded) {
      return {
        icon: '🔐',
        title: 'Permission required',
        description:
          'The Files app needs access to one of your folders. Grant access again to reconnect and list its contents.',
        action: true,
      };
    }
    if (!dirHandle) {
      return {
        icon: '📂',
        title: 'Choose a workspace',
        description:
          'Select a folder to browse its files. You control which directories are shared with this demo.',
        action: true,
      };
    }
    if (!hasEntries) {
      return {
        icon: '🗂️',
        title: 'This folder is empty',
        description:
          'Add files or subdirectories to this location to see them listed here. Changes stay inside your browser sandbox.',
        action: true,
      };
    }
    return null;
  })();

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm">
      <div className="flex items-center space-x-2 p-2 bg-ub-warm-grey bg-opacity-40">
        <button
          onClick={openFolder}
          className="px-2 py-1 bg-black bg-opacity-50 rounded"
          title="Grant this Files app access to a folder using the browser&apos;s Origin Private File System (OPFS)."
        >
          Open Folder
        </button>
        {path.length > 1 && (
          <button onClick={goBack} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Back
          </button>
        )}
        <Breadcrumbs path={path} onNavigate={navigateTo} />
        {locationError && (
          <div className="text-xs text-red-300" role="alert" aria-live="assertive">
            {locationError}
          </div>
        )}
        {currentFile && (
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
        )}
      </div>
      <div className="px-3 py-2 text-xs text-gray-200 bg-ub-warm-grey bg-opacity-20">
        {'Files opened here are cached with the browser\'s Origin Private File System (OPFS). Reopen the same folder to pick up unsaved changes.'}
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
              key={i}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openFile(f)}
            >
              {f.name}
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          {currentFile ? (
            <textarea
              className="flex-1 p-2 bg-ub-cool-grey outline-none"
              value={content}
              onChange={onChange}
              aria-label="File contents"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 px-6">
              {emptyState ? (
                <>
                  <div className="text-5xl" aria-hidden="true">
                    {emptyState.icon}
                  </div>
                  <h2 className="text-lg font-semibold">{emptyState.title}</h2>
                  <p className="text-sm text-gray-200 max-w-xs">{emptyState.description}</p>
                  {emptyState.action && (
                    <button
                      onClick={openFolder}
                      className="px-3 py-1.5 bg-black bg-opacity-50 rounded"
                    >
                      Grant access
                    </button>
                  )}
                  <p className="text-xs text-gray-300 max-w-xs">
                    OPFS keeps a private copy of any edits inside this browser so your real files stay untouched until you save.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-200">Select a file from the sidebar to preview its contents.</p>
              )}
            </div>
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
