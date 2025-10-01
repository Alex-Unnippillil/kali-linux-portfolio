"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import {
  emptySidecar,
  readSidecar,
  writeSidecar,
  deleteSidecar,
  exportSidecars,
  importSidecars,
  applyImportResolution,
  isSidecarFileName,
} from '../../utils/sidecar';

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
  const [sidecar, setSidecar] = useState(null);
  const [sidecarDraft, setSidecarDraft] = useState(null);
  const [sidecarSaving, setSidecarSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [importStatus, setImportStatus] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importConflicts, setImportConflicts] = useState([]);
  const [conflictChoices, setConflictChoices] = useState({});
  const notesSaveRef = useRef(null);
  const [importing, setImporting] = useState(false);

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
  const resetImportState = useCallback(() => {
    setImportConflicts([]);
    setConflictChoices({});
    setImportStatus(null);
    setImportError(null);
  }, []);

  useEffect(() => () => {
    if (notesSaveRef.current) {
      clearTimeout(notesSaveRef.current);
      notesSaveRef.current = null;
    }
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

  const loadMetadata = useCallback(async () => {
    if (!dirHandle || !currentFile) {
      setSidecar(null);
      setSidecarDraft(null);
      setTagInput('');
      setSidecarSaving(false);
      return;
    }
    try {
      const meta = await readSidecar(dirHandle, currentFile.name);
      const normalized = meta ?? emptySidecar();
      setSidecar(normalized);
      setSidecarDraft(normalized);
      setTagInput(normalized.tags.join(', '));
    } catch {
      const fallback = emptySidecar();
      setSidecar(fallback);
      setSidecarDraft(fallback);
      setTagInput('');
    } finally {
      setSidecarSaving(false);
    }
  }, [dirHandle, currentFile]);

  const arraysEqual = (a = [], b = []) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  };

  const updateMetadata = useCallback(
    async (patch) => {
      if (!dirHandle || !currentFile) return;
      const base = sidecar ?? emptySidecar();
      setSidecarDraft((prev) => ({
        ...(prev ?? emptySidecar()),
        ...patch,
        tags: Array.isArray(patch?.tags)
          ? patch.tags
          : prev?.tags ?? base.tags,
      }));
      if (Object.prototype.hasOwnProperty.call(patch, 'tags') && Array.isArray(patch.tags)) {
        setTagInput(patch.tags.join(', '));
      }

      const diff = {};
      if (Object.prototype.hasOwnProperty.call(patch, 'notes') && patch.notes !== base.notes) {
        diff.notes = patch.notes;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'tags')) {
        const tags = Array.isArray(patch.tags) ? patch.tags : [];
        if (!arraysEqual(tags, base.tags)) diff.tags = tags;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'rating') && patch.rating !== base.rating) {
        diff.rating = patch.rating;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'favorite') && patch.favorite !== base.favorite) {
        diff.favorite = patch.favorite;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'color') && patch.color !== base.color) {
        diff.color = patch.color;
      }

      if (Object.keys(diff).length === 0) return;

      setSidecarSaving(true);
      setImportError(null);
      try {
        const updated = await writeSidecar(dirHandle, currentFile.name, diff);
        setSidecar(updated);
        setSidecarDraft(updated);
        setTagInput(updated.tags.join(', '));
      } catch {
        setImportError('Failed to update metadata.');
      } finally {
        setSidecarSaving(false);
      }
    },
    [dirHandle, currentFile, sidecar],
  );

  const handleNotesChange = useCallback(
    (value) => {
      setSidecarDraft((prev) => ({ ...(prev ?? emptySidecar()), notes: value }));
      if (notesSaveRef.current) clearTimeout(notesSaveRef.current);
      notesSaveRef.current = setTimeout(() => {
        updateMetadata({ notes: value });
      }, 400);
    },
    [updateMetadata],
  );

  const handleNotesBlur = useCallback(() => {
    if (notesSaveRef.current) {
      clearTimeout(notesSaveRef.current);
      notesSaveRef.current = null;
    }
    updateMetadata({ notes: sidecarDraft?.notes ?? '' });
  }, [sidecarDraft, updateMetadata]);

  const commitTags = useCallback(() => {
    const tags = tagInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    updateMetadata({ tags });
  }, [tagInput, updateMetadata]);

  const handleFavoriteToggle = useCallback(
    (checked) => {
      updateMetadata({ favorite: checked });
    },
    [updateMetadata],
  );

  const handleRatingChange = useCallback(
    (value) => {
      if (value === 'none') {
        updateMetadata({ rating: null });
      } else {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) updateMetadata({ rating: parsed });
      }
    },
    [updateMetadata],
  );

  const handleClearMetadata = useCallback(async () => {
    if (!dirHandle || !currentFile) return;
    setSidecarSaving(true);
    setImportError(null);
    try {
      await deleteSidecar(dirHandle, currentFile.name);
      const reset = emptySidecar();
      setSidecar(reset);
      setSidecarDraft(reset);
      setTagInput('');
    } catch {
      setImportError('Unable to clear metadata.');
    } finally {
      setSidecarSaving(false);
    }
  }, [dirHandle, currentFile]);

  const handleExportMetadata = useCallback(async () => {
    if (!dirHandle) return;
    try {
      setImportError(null);
      const payload = await exportSidecars(dirHandle);
      if (!payload.entries.length) {
        setImportStatus('No metadata to export.');
        return;
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const label = path
        .map((crumb) => crumb.name || 'root')
        .filter(Boolean)
        .join('-')
        .replace(/[^a-z0-9-]+/gi, '_') || 'metadata';
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${label}.sidecars.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setImportStatus(`Exported ${payload.entries.length} record${payload.entries.length === 1 ? '' : 's'}.`);
    } catch {
      setImportError('Failed to export metadata.');
    }
  }, [dirHandle, path]);

  const handleImportMetadata = useCallback(async () => {
    if (!dirHandle) return;
    try {
      setImportError(null);
      setImportStatus(null);
      const handle = await openFileDialog({
        types: [
          {
            description: 'Metadata JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      if (!handle) return;
      const file = await handle.getFile();
      if (!file) return;
      const text = await file.text();
      setImporting(true);
      const result = await importSidecars(dirHandle, text, { strategy: 'newer' });
      if (result.conflicts.length) {
        const defaults = {};
        result.conflicts.forEach((conflict) => {
          defaults[conflict.path] = 'existing';
        });
        setConflictChoices(defaults);
        setImportConflicts(result.conflicts);
        setImportStatus('Import completed with conflicts.');
      } else {
        setImportConflicts([]);
        setConflictChoices({});
        setImportError(null);
        setImportStatus(`Imported ${result.applied.length} record${result.applied.length === 1 ? '' : 's'}.`);
        await loadMetadata();
      }
    } catch {
      setImportError('Failed to import metadata.');
      setImportConflicts([]);
      setConflictChoices({});
    } finally {
      setImporting(false);
    }
  }, [dirHandle, loadMetadata]);

  const applyConflictResolutions = useCallback(async () => {
    if (!dirHandle || !importConflicts.length) return;
    setImporting(true);
    try {
      for (const conflict of importConflicts) {
        const choice = conflictChoices[conflict.path] || 'existing';
        await applyImportResolution(dirHandle, conflict, choice);
      }
      setImportStatus('Conflicts resolved.');
      setImportError(null);
      setImportConflicts([]);
      setConflictChoices({});
      await loadMetadata();
    } catch {
      setImportError('Failed to apply conflict resolutions.');
    } finally {
      setImporting(false);
    }
  }, [dirHandle, importConflicts, conflictChoices, loadMetadata]);

  const handleConflictChoice = useCallback((pathKey, value) => {
    setConflictChoices((prev) => ({ ...prev, [pathKey]: value }));
  }, []);

  const describeValue = (value) => {
    if (Array.isArray(value)) return value.join(', ') || '—';
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };

  const formatTimestamp = (value) => {
    if (!value) return 'Never';
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return 'Unknown';
    return new Date(parsed).toLocaleString();
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

  useEffect(() => {
    if (!currentFile) {
      setSidecar(null);
      setSidecarDraft(null);
      setTagInput('');
      return;
    }
    if (notesSaveRef.current) {
      clearTimeout(notesSaveRef.current);
      notesSaveRef.current = null;
    }
    setSidecarSaving(true);
    loadMetadata();
  }, [currentFile, loadMetadata]);

  const readDir = useCallback(async (handle) => {
    resetImportState();
    const ds = [];
    const fs = [];
    for await (const [name, h] of handle.entries()) {
      if (h.kind === 'file') {
        if (isSidecarFileName(name)) continue;
        fs.push({ name, handle: h });
      } else if (h.kind === 'directory') ds.push({ name, handle: h });
    }
    setDirs(ds);
    setFiles(fs);
  }, [resetImportState]);

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
        <button
          onClick={handleExportMetadata}
          disabled={!dirHandle || importing}
          className="px-2 py-1 bg-black bg-opacity-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export Metadata
        </button>
        <button
          onClick={handleImportMetadata}
          disabled={!dirHandle || importing}
          className="px-2 py-1 bg-black bg-opacity-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Import Metadata
        </button>
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
              key={i}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openFile(f)}
            >
              {f.name}
            </div>
          ))}
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            {currentFile ? (
              <textarea className="flex-1 p-2 bg-ub-cool-grey outline-none" value={content} onChange={onChange} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-300">
                Select a file to view content and metadata
              </div>
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
          <div className="w-72 border-l border-gray-600 bg-black bg-opacity-30 p-3 overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wide text-gray-300">Info</h2>
              {sidecarSaving && <span className="text-[10px] text-gray-400">Saving…</span>}
            </div>
            {sidecarDraft ? (
              <div className="mt-2 space-y-3 text-sm">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Tags</label>
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onBlur={commitTags}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitTags();
                      }
                    }}
                    placeholder="Comma separated"
                    className="w-full rounded bg-black bg-opacity-40 px-2 py-1 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Notes</label>
                  <textarea
                    value={sidecarDraft.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    onBlur={handleNotesBlur}
                    className="w-full h-24 rounded bg-black bg-opacity-40 px-2 py-1 text-white focus:outline-none resize-none"
                    placeholder="Add notes about this file"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wide text-gray-400">Favorite</label>
                  <input
                    type="checkbox"
                    checked={!!sidecarDraft.favorite}
                    onChange={(e) => handleFavoriteToggle(e.target.checked)}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Rating</label>
                  <select
                    value={sidecarDraft.rating ?? 'none'}
                    onChange={(e) => handleRatingChange(e.target.value)}
                    className="w-full bg-black bg-opacity-40 px-2 py-1 text-white rounded focus:outline-none"
                  >
                    <option value="none">No rating</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} star{value > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-gray-400">
                  <div>Last updated</div>
                  <div className="text-white">
                    {formatTimestamp(sidecarDraft.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleClearMetadata}
                    disabled={!currentFile}
                    className="px-2 py-1 bg-black bg-opacity-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear Metadata
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-gray-400">Metadata will appear when a file is selected.</div>
            )}
            {(importStatus || importError) && (
              <div className="mt-4 space-y-1 text-xs">
                {importStatus && <div className="text-green-300">{importStatus}</div>}
                {importError && <div className="text-red-300">{importError}</div>}
              </div>
            )}
            {importConflicts.length > 0 && (
              <div className="mt-4 border-t border-gray-700 pt-3 space-y-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Conflicts</div>
                {importConflicts.map((conflict) => (
                  <div key={conflict.path} className="space-y-2 rounded bg-black bg-opacity-40 p-2">
                    <div className="text-sm font-semibold text-white">{conflict.path}</div>
                    <div className="space-y-1 text-xs text-gray-300">
                      {conflict.conflicts.map((entry, idx) => (
                        <div key={`${conflict.path}-${idx}`}>
                          <div className="font-semibold text-gray-200">{entry.field}</div>
                          <div className="flex gap-2">
                            <span className="text-green-300">Incoming: {describeValue(entry.incoming)}</span>
                            <span className="text-blue-300">Existing: {describeValue(entry.existing)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 text-xs">
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          checked={(conflictChoices[conflict.path] || 'existing') === 'existing'}
                          onChange={() => handleConflictChoice(conflict.path, 'existing')}
                        />
                        Keep existing
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          checked={conflictChoices[conflict.path] === 'incoming'}
                          onChange={() => handleConflictChoice(conflict.path, 'incoming')}
                        />
                        Use imported
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  onClick={applyConflictResolutions}
                  disabled={importing}
                  className="w-full px-2 py-1 bg-black bg-opacity-60 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply Resolutions
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
