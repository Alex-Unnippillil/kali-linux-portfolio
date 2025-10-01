"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import useCpuBudget from '../../hooks/useCpuBudget';
import { generateThumbnail } from '../../utils/thumbnailGenerator';
import { getFileIconComponent, resolveFileIconKey, FolderIcon } from '../../utils/fileIcons';

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
const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'mpg', 'mpeg']);
const PDF_EXTENSIONS = new Set(['pdf']);
const VIEW_OPTIONS = [
  { key: 'list', label: 'List' },
  { key: 'grid', label: 'Grid' },
];

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
  const [viewMode, setViewMode] = useState('list');
  const [thumbnails, setThumbnails] = useState({});
  const [fileMeta, setFileMeta] = useState({});
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasCpuBudget = useCpuBudget({ minCores: 4, minMemoryGb: 4 });

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
    setThumbnails((prev) => {
      Object.values(prev).forEach((thumb) => thumb?.revoke?.());
      return {};
    });
    setFileMeta({});
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

  useEffect(() => {
    if (!files.length) {
      setThumbnails((prev) => {
        Object.values(prev).forEach((thumb) => thumb?.revoke?.());
        return {};
      });
      setFileMeta({});
      return;
    }

    const validNames = new Set(files.map((file) => file.name));
    setThumbnails((prev) => {
      const next = {};
      for (const [name, thumb] of Object.entries(prev)) {
        if (validNames.has(name)) {
          next[name] = thumb;
        } else {
          thumb?.revoke?.();
        }
      }
      return next;
    });
    setFileMeta((prev) => {
      const next = {};
      for (const [name, meta] of Object.entries(prev)) {
        if (validNames.has(name)) next[name] = meta;
      }
      return next;
    });

    let cancelled = false;
    const abortController = new AbortController();
    const queue = files.slice();

    function loadNext() {
      if (cancelled || !queue.length) return;
      const entry = queue.shift();
      if (!entry?.handle?.getFile) {
        schedule();
        return;
      }
      (async () => {
        try {
          const file = await entry.handle.getFile();
          if (abortController.signal.aborted || cancelled) return;
          const mime = file.type || '';
          setFileMeta((prev) => {
            const current = prev[entry.name];
            if (current?.mime === mime) return prev;
            return { ...prev, [entry.name]: { mime } };
          });

          const ext = entry.name?.toLowerCase().split('.').pop() || '';
          const isVideo = mime.startsWith('video/') || VIDEO_EXTENSIONS.has(ext);
          const isPdf = mime === 'application/pdf' || PDF_EXTENSIONS.has(ext);

          if (prefersReducedMotion && isVideo) return;
          if (!hasCpuBudget && (isVideo || isPdf)) return;

          const thumb = await generateThumbnail(entry.handle, {
            file,
            signal: abortController.signal,
            allowVideo: !prefersReducedMotion && hasCpuBudget,
            allowPdf: hasCpuBudget,
          });

          if (!thumb || cancelled || abortController.signal.aborted) return;

          setThumbnails((prev) => {
            const current = prev[entry.name];
            if (current?.url === thumb.url) return prev;
            if (current?.revoke && current.url !== thumb.url) current.revoke();
            return { ...prev, [entry.name]: thumb };
          });
        } catch (error) {
          if (error?.name !== 'AbortError' && process.env.NODE_ENV !== 'production') {
            console.warn('Failed to generate thumbnail', error);
          }
        } finally {
          schedule();
        }
      })();
    }

    function schedule() {
      if (cancelled || !queue.length) return;
      const scheduler =
        typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
          ? window.requestIdleCallback
          : (fn) => setTimeout(fn, 50);
      scheduler(loadNext);
    }

    schedule();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [files, prefersReducedMotion, hasCpuBudget]);

  const renderPreview = (file, iconSize = 'w-7 h-7') => {
    const preview = thumbnails[file.name];
    if (preview && preview.url) {
      return (
        <img
          src={preview.url}
          alt={`${file.name} preview`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      );
    }
    const meta = fileMeta[file.name];
    const iconKey = resolveFileIconKey(file.name, meta?.mime);
    const Icon = getFileIconComponent(iconKey);
    return <Icon className={`${iconSize} text-sky-200`} aria-hidden="true" />;
  };

  const isListView = viewMode === 'list';

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
      <div className="flex flex-wrap items-center gap-2 p-2 bg-ub-warm-grey bg-opacity-40">
        <button onClick={openFolder} className="px-2 py-1 bg-black bg-opacity-50 rounded">
          Open Folder
        </button>
        {path.length > 1 && (
          <button onClick={goBack} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Back
          </button>
        )}
        <div className="flex-1 min-w-0">
          <Breadcrumbs path={path} onNavigate={navigateTo} />
        </div>
        {locationError && (
          <div className="text-xs text-red-300" role="status">
            {locationError}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded border border-white/20">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setViewMode(option.key)}
                className={`px-2 py-1 text-xs font-medium transition ${
                  viewMode === option.key
                    ? 'bg-black bg-opacity-60'
                    : 'bg-transparent hover:bg-black hover:bg-opacity-30'
                }`}
                aria-pressed={viewMode === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>
          {currentFile && (
            <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
              Save
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 border-r border-gray-600 overflow-y-auto">
          <div className="p-3 font-bold uppercase tracking-wide text-xs text-gray-300">Recent</div>
          <div className="space-y-1 px-2 pb-4">
            {recent.length === 0 && <div className="text-xs text-gray-400 px-2">No recent directories</div>}
            {recent.map((entry, i) => (
              <button
                key={`${entry.name}-${i}`}
                type="button"
                onClick={() => openRecent(entry)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-black hover:bg-opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              >
                <span className="flex items-center justify-center w-6 h-6 text-sky-200">
                  <FolderIcon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="truncate">{entry.name}</span>
              </button>
            ))}
          </div>
          <div className="p-3 font-bold uppercase tracking-wide text-xs text-gray-300 border-t border-gray-700">
            Directories
          </div>
          <div className="space-y-1 px-2 pb-4">
            {dirs.length === 0 && <div className="text-xs text-gray-400 px-2">No subdirectories</div>}
            {dirs.map((dir) => (
              <button
                key={dir.name}
                type="button"
                onClick={() => openDir(dir)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-black hover:bg-opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              >
                <span className="flex items-center justify-center w-6 h-6 text-sky-200">
                  <FolderIcon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="truncate">{dir.name}</span>
              </button>
            ))}
          </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
            <div className="flex-1 overflow-auto p-3">
              {files.length === 0 ? (
                <div className="text-sm text-gray-300">This directory does not contain any files.</div>
              ) : isListView ? (
                <ul role="list" className="space-y-1">
                  {files.map((file) => {
                    const isSelected = currentFile?.name === file.name;
                    return (
                      <li key={file.name}>
                        <button
                          type="button"
                          onClick={() => openFile(file)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded border border-transparent bg-black/20 hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 ${
                            isSelected ? 'border-sky-400 bg-black/40' : ''
                          }`}
                        >
                          <span className="w-12 h-12 rounded bg-black/40 overflow-hidden flex items-center justify-center">
                            {renderPreview(file)}
                          </span>
                          <span className="min-w-0 flex-1 text-left">
                            <span className="block font-medium truncate">{file.name}</span>
                            {fileMeta[file.name]?.mime && (
                              <span className="block text-xs text-gray-300 truncate">
                                {fileMeta[file.name].mime}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {files.map((file) => {
                    const isSelected = currentFile?.name === file.name;
                    return (
                      <button
                        key={file.name}
                        type="button"
                        onClick={() => openFile(file)}
                        className={`group flex flex-col items-center gap-2 rounded border border-transparent bg-black/20 p-3 hover:border-white/40 hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 ${
                          isSelected ? 'border-sky-400 bg-black/40' : ''
                        }`}
                      >
                        <span className="w-full max-w-[112px] aspect-square rounded bg-black/40 overflow-hidden flex items-center justify-center">
                          {renderPreview(file, 'w-10 h-10')}
                        </span>
                        <span className="text-xs font-medium text-center w-full truncate">{file.name}</span>
                        {fileMeta[file.name]?.mime && (
                          <span className="text-[0.65rem] text-gray-300 truncate w-full text-center">
                            {fileMeta[file.name].mime}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="md:w-1/2 flex flex-col border-t md:border-t-0 md:border-l border-gray-600 bg-black/10">
              {currentFile ? (
                <textarea
                  className="flex-1 min-h-[200px] p-3 bg-ub-cool-grey outline-none resize-none"
                  value={content}
                  onChange={onChange}
                />
              ) : (
                <div className="flex-1 min-h-[200px] p-3 text-sm text-gray-300 flex items-center justify-center text-center">
                  Select a file to preview its contents.
                </div>
              )}
              <div className="p-3 border-t border-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find in files"
                    className="flex-1 px-2 py-1 text-black rounded"
                  />
                  <button onClick={runSearch} className="px-2 py-1 bg-black bg-opacity-50 rounded">
                    Search
                  </button>
                </div>
                <div className="max-h-40 overflow-auto space-y-1">
                  {results.map((r, i) => (
                    <div key={`${r.file}-${r.line}-${i}`} className="text-xs">
                      <span className="font-semibold">{r.file}:{r.line}</span> {r.text}
                    </div>
                  ))}
                  {results.length === 0 && query && <div className="text-xs text-gray-400">No matches found.</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
