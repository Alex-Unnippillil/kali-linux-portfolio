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
  const [permissionIssue, setPermissionIssue] = useState(null);
  const [regranting, setRegranting] = useState(false);
  const pendingOpsRef = useRef([]);
  const dirHandleRef = useRef(null);
  const pathNamesRef = useRef([]);
  const currentFileRef = useRef(null);
  const contentRef = useRef('');
  const rootHandleRef = useRef(null);

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
    dirHandleRef.current = dirHandle;
  }, [dirHandle]);

  useEffect(() => {
    pathNamesRef.current = path.map((p) => p?.name || '/');
    if (path.length > 0) {
      rootHandleRef.current = path[0]?.handle || rootHandleRef.current;
    }
  }, [path]);

  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const isPermissionError = (error) => {
    if (!error) return false;
    const { name = '', message = '' } = error;
    if (name === 'NotAllowedError' || name === 'SecurityError') return true;
    return /permission/i.test(message || '');
  };

  const handlePermissionError = useCallback(
    (error, operation) => {
      if (!isPermissionError(error)) return false;
      if (operation) {
        pendingOpsRef.current.push(operation);
      }
      setPermissionIssue(
        'Access to this folder was revoked by the browser. Re-open it to resume pending actions.',
      );
      return true;
    },
    [],
  );

  const runWithPermission = useCallback(
    async (operation, { requeue = true } = {}) => {
      try {
        return await operation();
      } catch (error) {
        if (handlePermissionError(error, requeue ? operation : null)) {
          return null;
        }
        throw error;
      }
    },
    [handlePermissionError],
  );

  const flushPendingOperations = useCallback(async () => {
    if (!pendingOpsRef.current.length) return;
    const queue = [...pendingOpsRef.current];
    pendingOpsRef.current = [];
    for (const op of queue) {
      try {
        await op();
      } catch (error) {
        if (!handlePermissionError(error, op)) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }
    }
  }, [handlePermissionError]);

  const resolvePath = useCallback(async (names, rootOverride) => {
    const baseHandle = rootOverride || rootHandleRef.current;
    if (!baseHandle) return null;
    const pathNames = Array.isArray(names) && names.length ? names : [baseHandle.name || '/'];
    const [first, ...rest] = pathNames;
    const crumbs = [
      {
        name: first || baseHandle.name || '/',
        handle: baseHandle,
      },
    ];
    let current = baseHandle;
    for (const segment of rest) {
      if (!segment || segment === '/') continue;
      try {
        current = await current.getDirectoryHandle(segment);
        crumbs.push({ name: segment, handle: current });
      } catch {
        break;
      }
    }
    return { handle: current, crumbs };
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
      rootHandleRef.current = handle;
      const operation = async () => {
        setDirHandle(handle);
        addRecentDir(handle);
        setRecent(await getRecentDirs());
        const crumbName = handle.name || '/';
        setPath([{ name: crumbName, handle }]);
        await readDir(handle);
        setLocationError(null);
        setPermissionIssue(null);
      };
      await runWithPermission(operation, { requeue: false });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (!handlePermissionError(error)) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      rootHandleRef.current = entry.handle;
      const operation = async () => {
        setDirHandle(entry.handle);
        setPath([{ name: entry.name || entry.handle.name || '/', handle: entry.handle }]);
        await readDir(entry.handle);
        setLocationError(null);
        setPermissionIssue(null);
      };
      await runWithPermission(operation);
    } catch (error) {
      if (!handlePermissionError(error)) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
  };

  const openFile = useCallback(
    async (file) => {
      const name = typeof file === 'string' ? file : file?.name;
      if (!name) return;
      const operation = async () => {
        const resolved = await resolvePath(pathNamesRef.current);
        if (!resolved?.handle) return;
        let handle = null;
        try {
          handle = await resolved.handle.getFileHandle(name);
        } catch (error) {
          if (error?.name === 'NotFoundError' && typeof file !== 'string' && file?.handle) {
            handle = file.handle;
          } else {
            throw error;
          }
        }
        if (!handle) return;
        let text = '';
        if (opfsSupported) {
          const unsaved = await loadBuffer(name);
          if (unsaved !== null) text = unsaved;
        }
        if (!text) {
          const f = await handle.getFile();
          text = await f.text();
        }
        setCurrentFile({ name, handle });
        setContent(text);
        setPermissionIssue(null);
      };
      await runWithPermission(operation);
    },
    [resolvePath, runWithPermission, opfsSupported, loadBuffer],
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
      const targetNames = [...pathNamesRef.current, dir.name];
      const operation = async () => {
        const resolved = await resolvePath(targetNames);
        if (!resolved?.handle) return;
        setDirHandle(resolved.handle);
        setPath(resolved.crumbs);
        await readDir(resolved.handle);
        setLocationError(null);
        setPermissionIssue(null);
      };
      await runWithPermission(operation);
    },
    [resolvePath, runWithPermission, readDir],
  );

  const navigateTo = useCallback(
    async (index) => {
      const names = pathNamesRef.current.slice(0, index + 1);
      if (!names.length) return;
      const operation = async () => {
        const resolved = await resolvePath(names);
        if (!resolved?.handle) return;
        setDirHandle(resolved.handle);
        setPath(resolved.crumbs);
        await readDir(resolved.handle);
        setLocationError(null);
        setPermissionIssue(null);
      };
      await runWithPermission(operation);
    },
    [resolvePath, runWithPermission, readDir],
  );

  const goBack = useCallback(async () => {
    if (pathNamesRef.current.length <= 1) return;
    const names = pathNamesRef.current.slice(0, -1);
    const operation = async () => {
      const resolved = await resolvePath(names);
      if (!resolved?.handle) return;
      setDirHandle(resolved.handle);
      setPath(resolved.crumbs);
      await readDir(resolved.handle);
      setLocationError(null);
      setPermissionIssue(null);
    };
    await runWithPermission(operation);
  }, [resolvePath, runWithPermission, readDir]);

  const saveFile = useCallback(async () => {
    const fileName = currentFileRef.current?.name;
    if (!fileName) return;
    const operation = async () => {
      const resolved = await resolvePath(pathNamesRef.current);
      if (!resolved?.handle) return;
      let handle = currentFileRef.current?.handle || null;
      try {
        handle = await resolved.handle.getFileHandle(fileName, { create: true });
      } catch (error) {
        if (error?.name !== 'NotFoundError' || !handle) {
          throw error;
        }
      }
      if (!handle) return;
      const writable = await handle.createWritable();
      await writable.write(contentRef.current);
      await writable.close();
      setCurrentFile({ name: fileName, handle });
      if (opfsSupported) await removeBuffer(fileName);
      setPermissionIssue(null);
    };
    await runWithPermission(operation);
  }, [resolvePath, runWithPermission, opfsSupported, removeBuffer]);

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

  const regrantAccess = useCallback(async () => {
    if (typeof window === 'undefined' || !window.showDirectoryPicker) return;
    try {
      setRegranting(true);
      const startIn = path[0]?.handle || dirHandleRef.current || undefined;
      const pickerOptions = startIn ? { startIn } : undefined;
      const handle = await window.showDirectoryPicker(pickerOptions);
      rootHandleRef.current = handle;
      addRecentDir(handle);
      setRecent(await getRecentDirs());
      const names = pathNamesRef.current.length
        ? [pathNamesRef.current[0] || handle.name || '/', ...pathNamesRef.current.slice(1)]
        : [handle.name || '/'];
      const resolved = await resolvePath(names, handle);
      if (resolved) {
        setDirHandle(resolved.handle);
        setPath(resolved.crumbs);
        await runWithPermission(async () => {
          await readDir(resolved.handle);
        });
      } else {
        setDirHandle(handle);
        setPath([{ name: handle.name || '/', handle }]);
        await runWithPermission(async () => {
          await readDir(handle);
        });
      }
      setPermissionIssue(null);
      setLocationError(null);
      const fileName = currentFileRef.current?.name;
      if (fileName) {
        await openFile(fileName);
      }
      await flushPendingOperations();
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (!handlePermissionError(error)) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    } finally {
      setRegranting(false);
    }
  }, [
    path,
    resolvePath,
    runWithPermission,
    readDir,
    openFile,
    flushPendingOperations,
    handlePermissionError,
  ]);

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
        <div className="ml-auto flex items-center space-x-3">
          {locationError && (
            <div className="text-xs text-red-300" role="status">
              {locationError}
            </div>
          )}
          {permissionIssue && (
            <div className="flex items-center space-x-2 text-xs text-yellow-200" role="status">
              <span>{permissionIssue}</span>
              <button
                onClick={regrantAccess}
                disabled={regranting}
                className="px-2 py-1 bg-black bg-opacity-50 rounded disabled:opacity-50"
              >
                {regranting ? 'Re-opening…' : 'Re-open Folder'}
              </button>
            </div>
          )}
          {currentFile && (
            <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
              Save
            </button>
          )}
        </div>
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
  );
}
