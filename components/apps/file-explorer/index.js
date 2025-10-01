"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useOPFS from '../../../hooks/useOPFS';
import { getDb } from '../../../utils/safeIDB';
import Breadcrumbs from '../../ui/Breadcrumbs';
import DiffModal from './DiffModal';
import {
  DEFAULT_RETENTION_POLICY,
  loadRetentionPolicy,
  saveRetentionPolicy,
  recordVersion,
  listVersions,
  loadVersionContent,
  enforceRetentionForFile,
  runGlobalGarbageCollection,
} from './versionStore';

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
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

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
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
  const [versions, setVersions] = useState([]);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versionError, setVersionError] = useState(null);
  const [retentionPolicy, setRetentionPolicy] = useState(DEFAULT_RETENTION_POLICY);
  const [retentionDraft, setRetentionDraft] = useState(DEFAULT_RETENTION_POLICY);
  const [savingRetention, setSavingRetention] = useState(false);
  const [diffState, setDiffState] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

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
    const ok = !!window?.showDirectoryPicker;
    setSupported(ok);
    if (ok) getRecentDirs().then((dirs) => mountedRef.current && setRecent(dirs));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRetentionPolicy()
      .then((policy) => {
        if (cancelled || !mountedRef.current) return;
        setRetentionPolicy(policy);
        setRetentionDraft(policy);
        runGlobalGarbageCollection(policy);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const computePathLabel = useCallback((crumbs) => {
    if (!crumbs?.length) return '/';
    const names = crumbs
      .map((crumb, index) => {
        const label = crumb?.name ?? '';
        if (index === 0 && (!label || label === '/')) {
          return '';
        }
        return label;
      })
      .filter(Boolean);
    const joined = names.join('/');
    return joined || '/';
  }, []);

  const makeFileKey = useCallback(
    (crumbs, fileName) => {
      const label = computePathLabel(crumbs);
      if (!fileName) return null;
      return label === '/' ? fileName : `${label}/${fileName}`;
    },
    [computePathLabel],
  );

  const readDir = useCallback(async (handle) => {
    const ds = [];
    const fs = [];
    for await (const [name, h] of handle.entries()) {
      if (h.kind === 'file') fs.push({ name, handle: h });
      else if (h.kind === 'directory') ds.push({ name, handle: h });
    }
    if (mountedRef.current) {
      setDirs(ds);
      setFiles(fs);
    }
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    let cancelled = false;
    (async () => {
      try {
        const unsaved = await getDir('unsaved');
        if (!cancelled && mountedRef.current) setUnsavedDir(unsaved);
        if (!cancelled && mountedRef.current) {
          setDirHandle(root);
          setPath([{ name: root.name || '/', handle: root }]);
          await readDir(root);
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setUnsavedDir(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opfsSupported, root, getDir, readDir]);

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
          if (!active || !mountedRef.current) return;
          setDirHandle(root);
          setPath([{ name: root.name || '/', handle: root }]);
          await readDir(root);
          if (active && mountedRef.current) setLocationError(null);
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
        if (!active || !mountedRef.current) return;
        setDirHandle(current);
        setPath(crumbs);
        await readDir(current);
        if (active && mountedRef.current) setLocationError(null);
      } catch {
        if (active && mountedRef.current)
          setLocationError(`Unable to open ${requested}`);
      }
    };
    setLocationError(null);
    openPath();
    return () => {
      active = false;
    };
  }, [context, initialPath, pathProp, opfsSupported, root, readDir]);

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

  const refreshVersions = useCallback(
    async (fileKey) => {
      if (!fileKey) {
        if (mountedRef.current) {
          setVersions([]);
        }
        return;
      }
      try {
        if (mountedRef.current) {
          setVersionLoading(true);
          setVersionError(null);
        }
        const history = await listVersions(fileKey);
        if (mountedRef.current) {
          setVersions(history);
        }
      } catch {
        if (mountedRef.current) {
          setVersionError('Unable to load version history.');
        }
      } finally {
        if (mountedRef.current) setVersionLoading(false);
      }
    },
    [],
  );

  const openFallback = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const key = file.name;
    setCurrentFile({ name: file.name, pathLabel: '/', key });
    setContent(text);
    setVersions([]);
    setVersionError('Version history is unavailable for files opened via upload.');
  };

  const openFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirHandle(handle);
      addRecentDir(handle);
      setRecent(await getRecentDirs());
      const crumbs = [{ name: handle.name || '/', handle }];
      setPath(crumbs);
      await readDir(handle);
      setLocationError(null);
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      setDirHandle(entry.handle);
      const crumbs = [{ name: entry.name || '/', handle: entry.handle }];
      setPath(crumbs);
      await readDir(entry.handle);
      setLocationError(null);
    } catch {}
  };

  const openFile = async (file) => {
    const pathLabel = computePathLabel(path);
    const key = makeFileKey(path, file.name);
    setCurrentFile({ ...file, pathLabel, key });
    let text = '';
    if (opfsSupported) {
      const unsaved = await loadBuffer(file.name);
      if (unsaved !== null) text = unsaved;
    }
    if (!text && file?.handle?.getFile) {
      const f = await file.handle.getFile();
      text = await f.text();
    }
    setContent(text);
    if (file?.handle) {
      await refreshVersions(key);
    } else {
      setVersions([]);
      setVersionError('Version history requires a directory handle.');
    }
  };

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
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
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
    if (!currentFile?.handle) return;
    try {
      const existingFile = await currentFile.handle.getFile();
      const previousContent = await existingFile.text();
      const writable = await currentFile.handle.createWritable();
      if (previousContent === content) {
        await writable.close();
        if (opfsSupported) await removeBuffer(currentFile.name);
        await refreshVersions(currentFile.key);
        return;
      }
      await recordVersion(currentFile.key, previousContent, {
        name: currentFile.name,
        path: currentFile.pathLabel,
      });
      await enforceRetentionForFile(currentFile.key, retentionPolicy);
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile.name);
      await refreshVersions(currentFile.key);
    } catch (err) {
      console.error('Failed to save file', err);
    }
  };

  const onChange = (e) => {
    const text = e.target.value;
    setContent(text);
    if (opfsSupported && currentFile?.name) saveBuffer(currentFile.name, text);
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

  const openDiff = async (version) => {
    setDiffState({ version, loading: true, base: '', target: content });
    try {
      const text = await loadVersionContent(version);
      if (!mountedRef.current) return;
      if (text === null) {
        setDiffState(null);
        return;
      }
      setDiffState({ version, loading: false, base: text, target: content });
    } catch {
      if (mountedRef.current) setDiffState(null);
    }
  };

  const closeDiff = () => setDiffState(null);

  const restoreFromDiff = async (restored) => {
    if (!currentFile) return;
    setContent(restored);
    if (opfsSupported && currentFile.name) await saveBuffer(currentFile.name, restored);
    setDiffState(null);
  };

  const onSubmitRetention = async (e) => {
    e.preventDefault();
    const normalized = {
      maxVersions: Math.max(1, Number(retentionDraft.maxVersions) || 1),
      maxDays: Math.max(0, Number(retentionDraft.maxDays) || 0),
    };
    setSavingRetention(true);
    try {
      await saveRetentionPolicy(normalized);
      setRetentionPolicy(normalized);
      await runGlobalGarbageCollection(normalized);
      if (currentFile?.key) await refreshVersions(currentFile.key);
    } finally {
      if (mountedRef.current) setSavingRetention(false);
    }
  };

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
      <DiffModal
        open={!!diffState}
        loading={!!diffState?.loading}
        baseContent={diffState?.base ?? ''}
        targetContent={diffState?.target ?? content}
        baseLabel={
          diffState?.version
            ? `Version @ ${new Date(diffState.version.timestamp).toLocaleString()}`
            : 'Version'
        }
        targetLabel={currentFile?.name ? `Current (${currentFile.name})` : 'Current'}
        onClose={closeDiff}
        onRestore={restoreFromDiff}
      />
      <div className="flex items-center flex-wrap gap-2 p-2 bg-ub-warm-grey bg-opacity-40">
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
        {currentFile?.handle && (
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
        )}
        {currentFile?.pathLabel && (
          <span className="ml-auto text-xs text-gray-300 truncate max-w-[45%]">
            {currentFile.pathLabel === '/'
              ? currentFile.name
              : `${currentFile.pathLabel}/${currentFile.name}`}
          </span>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 overflow-auto border-r border-gray-600 bg-black bg-opacity-20">
          <div className="p-2 font-bold uppercase tracking-wide text-xs text-gray-300">Recent</div>
          {recent.map((r, i) => (
            <div
              key={i}
              className="px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-30 truncate"
              onClick={() => openRecent(r)}
            >
              {r.name}
            </div>
          ))}
          <div className="p-2 font-bold uppercase tracking-wide text-xs text-gray-300">Directories</div>
          {dirs.map((d, i) => (
            <div
              key={i}
              className="px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-30 truncate"
              onClick={() => openDir(d)}
            >
              {d.name}
            </div>
          ))}
          <div className="p-2 font-bold uppercase tracking-wide text-xs text-gray-300">Files</div>
          {files.map((f, i) => (
            <div
              key={i}
              className="px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-30 truncate"
              onClick={() => openFile(f)}
            >
              {f.name}
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentFile ? (
            <textarea
              className="flex-1 p-2 bg-ub-cool-grey outline-none font-mono"
              value={content}
              onChange={onChange}
              aria-label="File contents"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a file to begin editing
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-3 border-t border-gray-600 bg-black bg-opacity-30 overflow-y-auto">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find in files"
                  className="px-2 py-1 text-black rounded"
                  aria-label="Search query"
                />
                <button onClick={runSearch} className="px-2 py-1 bg-black bg-opacity-50 rounded">
                  Search
                </button>
              </div>
              <div className="max-h-48 overflow-auto space-y-1 pr-1">
                {results.length === 0 ? (
                  <div className="text-xs text-gray-400">No matches yet.</div>
                ) : (
                  results.map((r, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-bold">{r.file}:{r.line}</span> {r.text}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold uppercase tracking-wide text-xs text-gray-300">
                  Version History
                </h3>
                <span className="text-[10px] text-gray-400">
                  Max {retentionPolicy.maxVersions} •
                  {' '}
                  {retentionPolicy.maxDays ? `${retentionPolicy.maxDays} day${retentionPolicy.maxDays === 1 ? '' : 's'}` : 'no expiry'}
                </span>
              </div>
              {versionError && (
                <div className="text-xs text-red-300 mb-2" role="status">
                  {versionError}
                </div>
              )}
              {versionLoading ? (
                <div className="text-xs text-gray-400">Loading versions…</div>
              ) : versions.length === 0 ? (
                <div className="text-xs text-gray-400">No saved versions yet.</div>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-auto pr-1">
                  {versions.map((version) => (
                    <li
                      key={version.id}
                      className="bg-black bg-opacity-40 rounded p-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(version.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{formatBytes(version.size)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDiff(version)}
                          className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-xs"
                        >
                          Compare / Restore
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form
                onSubmit={onSubmitRetention}
                className="mt-4 space-y-2 bg-black bg-opacity-40 rounded p-3 text-xs text-gray-200"
              >
                <div className="font-semibold uppercase tracking-wide text-[10px] text-gray-400">
                  Retention Policy
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="retention-max-versions">Max versions per file</label>
                  <input
                    id="retention-max-versions"
                    type="number"
                    min="1"
                    className="px-2 py-1 rounded bg-ub-cool-grey text-white border border-gray-700"
                    value={retentionDraft.maxVersions}
                    onChange={(e) =>
                      setRetentionDraft((prev) => ({
                        ...prev,
                        maxVersions: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    aria-label="Maximum versions"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="retention-max-days">Expire after (days, 0 = keep indefinitely)</label>
                  <input
                    id="retention-max-days"
                    type="number"
                    min="0"
                    className="px-2 py-1 rounded bg-ub-cool-grey text-white border border-gray-700"
                    value={retentionDraft.maxDays}
                    onChange={(e) =>
                      setRetentionDraft((prev) => ({
                        ...prev,
                        maxDays: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    aria-label="Retention days"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50"
                  disabled={savingRetention}
                >
                  {savingRetention ? 'Saving…' : 'Save policy'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
