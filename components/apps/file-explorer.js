"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import MountManager from '../../fs/providers/mount-manager';
import { ZipFileSystemProvider } from '../../fs/providers/zip';

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
        },
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

const isZipFile = (name) => /\.zip$/i.test(name || '');

const decodeMountContent = (value) => {
  if (value === null || value === undefined) return '[Unable to read file]';
  if (typeof value === 'string') return value;
  try {
    return new TextDecoder().decode(value);
  } catch {
    return '[Binary data]';
  }
};

const createNativeEntry = (name, handle) => ({ type: 'native', name, handle });

const createMountEntry = (record, path = '/') => ({
  type: 'mount',
  name: record.provider.label,
  providerId: record.id,
  path,
});

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
  const [mountedProviders, setMountedProviders] = useState([]);

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

  const mountManagerRef = useRef(null);
  if (!mountManagerRef.current) {
    mountManagerRef.current = new MountManager();
  }

  const refreshMounted = useCallback(() => {
    setMountedProviders(mountManagerRef.current.list());
  }, []);

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

  const readNativeDirectory = useCallback(async (handle) => {
    if (!handle) return;
    const ds = [];
    const fs = [];
    try {
      for await (const [name, h] of handle.entries()) {
        if (h.kind === 'file') {
          fs.push({ type: 'native', name, handle: h, isArchive: isZipFile(name) });
        } else if (h.kind === 'directory') {
          ds.push({ type: 'native', name, handle: h });
        }
      }
    } catch {}
    ds.sort((a, b) => a.name.localeCompare(b.name));
    fs.sort((a, b) => a.name.localeCompare(b.name));
    setDirs(ds);
    setFiles(fs);
  }, []);

  const readMountedDirectory = useCallback(async (providerId, targetPath = '/') => {
    const record = mountManagerRef.current.get(providerId);
    if (!record) return;
    try {
      const entries = await record.provider.list(targetPath || '/');
      const ds = entries
        .filter((entry) => entry.kind === 'directory')
        .map((entry) => ({
          type: 'mount',
          name: entry.name,
          providerId: record.id,
          path: entry.path || '/',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const fsEntries = entries
        .filter((entry) => entry.kind === 'file')
        .map((entry) => ({
          type: 'mount',
          name: entry.name,
          providerId: record.id,
          path: entry.path || '/',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setDirs(ds);
      setFiles(fsEntries);
    } catch {
      setLocationError(`Unable to read ${targetPath}`);
    }
  }, []);

  const readEntry = useCallback(
    async (entry) => {
      if (!entry) return;
      setLocationError(null);
      if (entry.type === 'native') {
        setDirHandle(entry.handle);
        await readNativeDirectory(entry.handle);
      } else {
        await readMountedDirectory(entry.providerId, entry.path || '/');
        setDirHandle(null);
      }
    },
    [readMountedDirectory, readNativeDirectory],
  );

  useEffect(() => {
    const ok = !!window.showDirectoryPicker;
    setSupported(ok);
    if (ok) getRecentDirs().then(setRecent);
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    let cancelled = false;
    (async () => {
      try {
        const dir = await getDir('unsaved');
        if (!cancelled) setUnsavedDir(dir);
      } catch {}
      if (cancelled) return;
      const rootEntry = createNativeEntry(root.name || '/', root);
      setPath([rootEntry]);
      await readEntry(rootEntry);
    })();
    return () => {
      cancelled = true;
    };
  }, [opfsSupported, root, getDir, readEntry]);

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
          const rootEntry = createNativeEntry(root.name || '/', root);
          setPath([rootEntry]);
          await readEntry(rootEntry);
          if (active) setLocationError(null);
          return;
        }
        let current = root;
        const crumbs = [createNativeEntry(root.name || '/', root)];
        const segments = sanitized
          .split('/')
          .map((segment) => segment.trim())
          .filter(Boolean);
        for (const segment of segments) {
          current = await current.getDirectoryHandle(segment, { create: true });
          crumbs.push(createNativeEntry(segment, current));
        }
        if (!active) return;
        setPath(crumbs);
        await readEntry(crumbs[crumbs.length - 1]);
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
  }, [context, initialPath, pathProp, opfsSupported, root, readEntry]);

  const openDir = useCallback(
    async (dir) => {
      if (!dir) return;
      const entry =
        dir.type === 'native'
          ? createNativeEntry(dir.name, dir.handle)
          : { type: 'mount', name: dir.name, providerId: dir.providerId, path: dir.path };
      setPath((p) => [...p, entry]);
      await readEntry(entry);
      setLocationError(null);
    },
    [readEntry],
  );

  const navigateTo = useCallback(
    async (index) => {
      const target = path[index];
      if (!target) return;
      setPath(path.slice(0, index + 1));
      await readEntry(target);
      setLocationError(null);
    },
    [path, readEntry],
  );

  const goBack = useCallback(async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setPath(newPath);
    if (prev) {
      await readEntry(prev);
      setLocationError(null);
    }
  }, [path, readEntry]);

  const openFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      const entry = createNativeEntry(handle.name || '/', handle);
      setDirHandle(handle);
      addRecentDir(handle);
      setRecent(await getRecentDirs());
      setPath([entry]);
      await readEntry(entry);
      setLocationError(null);
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      const rootEntry = createNativeEntry(entry.name, entry.handle);
      setDirHandle(entry.handle);
      setPath([rootEntry]);
      await readEntry(rootEntry);
      setLocationError(null);
    } catch {}
  };

  const mountArchive = useCallback(
    async (file) => {
      if (!file?.handle) return;
      try {
        const existing = mountManagerRef.current
          .list()
          .find((record) => record.source?.handle === file.handle);
        if (existing) {
          const entry = createMountEntry(existing, '/');
          setPath((prev) => [...prev, entry]);
          await readEntry(entry);
          return;
        }
        const blob = await file.handle.getFile();
        const provider = await ZipFileSystemProvider.fromBlob(file.name, blob);
        const record = mountManagerRef.current.mount(provider, { type: 'zip', handle: file.handle });
        refreshMounted();
        const entry = createMountEntry(record, '/');
        setPath((prev) => [...prev, entry]);
        await readEntry(entry);
        setLocationError(null);
      } catch {
        setLocationError(`Unable to mount archive ${file?.name || ''}`);
      }
    },
    [readEntry, refreshMounted],
  );

  const openMountedRoot = useCallback(
    async (record) => {
      const entry = createMountEntry(record, '/');
      setPath((prev) => {
        const nativeSegments = prev.filter((seg) => seg.type === 'native');
        return [...nativeSegments, entry];
      });
      await readEntry(entry);
      setLocationError(null);
    },
    [readEntry],
  );

  const unmountProvider = useCallback(
    async (id) => {
      mountManagerRef.current.unmount(id);
      refreshMounted();
      let targetAfterUnmount = null;
      setPath((prev) => {
        const index = prev.findIndex((seg) => seg.type === 'mount' && seg.providerId === id);
        if (index === -1) return prev;
        const updated = prev.slice(0, index);
        targetAfterUnmount = updated[updated.length - 1] || null;
        return updated;
      });
      if (currentFile?.type === 'mount' && currentFile.providerId === id) {
        setCurrentFile(null);
        setContent('');
      }
      if (targetAfterUnmount) {
        await readEntry(targetAfterUnmount);
      } else if (root) {
        const rootEntry = createNativeEntry(root.name || '/', root);
        setPath([rootEntry]);
        await readEntry(rootEntry);
      } else {
        setDirs([]);
        setFiles([]);
      }
    },
    [currentFile, readEntry, refreshMounted, root],
  );

  const openFile = async (file) => {
    if (!file) return;
    if (file.type === 'native') {
      if (file.isArchive) {
        await mountArchive(file);
        return;
      }
      setCurrentFile({ ...file, type: 'native', readOnly: false });
      let text = '';
      if (opfsSupported) {
        const unsaved = await loadBuffer(file.name);
        if (unsaved !== null && unsaved !== undefined) text = unsaved;
      }
      if (!text) {
        const f = await file.handle.getFile();
        text = await f.text();
      }
      setContent(text);
    } else {
      const record = mountManagerRef.current.get(file.providerId);
      if (!record) return;
      setCurrentFile({ ...file, type: 'mount', readOnly: true });
      const data = await record.provider.readFile(file.path, { as: 'text' });
      setContent(decodeMountContent(data));
    }
  };

  const saveFile = async () => {
    if (!currentFile || currentFile.type === 'mount' || !currentFile.handle) return;
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
    if (
      opfsSupported &&
      currentFile &&
      currentFile.type === 'native' &&
      !currentFile.readOnly &&
      currentFile.name
    ) {
      saveBuffer(currentFile.name, text);
    }
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

  const openFallback = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setCurrentFile({ name: file.name, fallback: true });
    setContent(text);
  };

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
        {currentFile?.handle && currentFile.type === 'native' && !currentFile.readOnly && (
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
        )}
        {currentFile?.readOnly && (
          <span className="text-xs text-ubt-blue">Read-only</span>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 overflow-auto border-r border-gray-600">
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
          <div className="p-2 font-bold">Mounted</div>
          {mountedProviders.length === 0 && (
            <div className="px-2 text-xs text-gray-300">No virtual mounts</div>
          )}
          {mountedProviders.map((record) => (
            <div
              key={record.id}
              className="px-2 py-1 hover:bg-black hover:bg-opacity-30 flex items-center justify-between"
            >
              <button
                type="button"
                onClick={() => openMountedRoot(record)}
                className="hover:underline"
              >
                {record.provider.label}
              </button>
              <button
                type="button"
                onClick={() => unmountProvider(record.id)}
                className="text-xs text-red-300 hover:underline"
              >
                Unmount
              </button>
            </div>
          ))}
          <div className="p-2 font-bold">Directories</div>
          {dirs.map((d, i) => (
            <div
              key={`${d.type}-${d.name}-${i}`}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openDir(d)}
            >
              {d.name}
            </div>
          ))}
          <div className="p-2 font-bold">Files</div>
          {files.map((f, i) => (
            <div
              key={`${f.type}-${f.name}-${i}`}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openFile(f)}
            >
              {f.name}
              {f.isArchive && <span className="text-xs text-ubt-blue ml-1">(archive)</span>}
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          {currentFile && (
            <textarea
              className="flex-1 p-2 bg-ub-cool-grey outline-none"
              value={content}
              onChange={onChange}
              readOnly={currentFile.type === 'mount' || currentFile.readOnly}
            />
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
