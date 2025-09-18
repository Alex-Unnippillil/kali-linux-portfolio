"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import Sidebar from './files/Sidebar';
import {
  addTagToFile,
  removeTagFromFile,
  subscribeToMetadata,
} from '../../modules/filesystem/metadata';
import {
  subscribeToSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
} from '../../utils/files/savedSearches';

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
const PROFILE_ID = 'default-profile';

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
  const [metadata, setMetadata] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [activeSavedSearchId, setActiveSavedSearchId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
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

  useEffect(() => {
    const ok = !!window.showDirectoryPicker;
    setSupported(ok);
    if (ok) getRecentDirs().then(setRecent);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToMetadata(PROFILE_ID, setMetadata);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSavedSearches(PROFILE_ID, setSavedSearches);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    (async () => {
      setUnsavedDir(await getDir('unsaved'));
      setDirHandle(root);
      const rootPath = '/';
      setPath([{ name: root.name || '/', handle: root, path: rootPath }]);
      await readDir(root, rootPath);
    })();
  }, [opfsSupported, root, getDir]);

  useEffect(() => {
    const sortedActive = [...activeTags].sort((a, b) => a.localeCompare(b));
    const match = savedSearches.find(
      (search) =>
        search.tags.length === sortedActive.length &&
        search.tags.every((tag, index) => tag === sortedActive[index]),
    );
    const nextId = match ? match.id : null;
    if (nextId !== activeSavedSearchId) setActiveSavedSearchId(nextId);
  }, [activeTags, savedSearches, activeSavedSearchId]);

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
      const rootPath = '/';
      setPath([{ name: handle.name || '/', handle, path: rootPath }]);
      setSelectedEntry(null);
      setCurrentFile(null);
      await readDir(handle, rootPath);
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      setDirHandle(entry.handle);
      const rootPath = '/';
      setPath([{ name: entry.name, handle: entry.handle, path: rootPath }]);
      setSelectedEntry(null);
      setCurrentFile(null);
      await readDir(entry.handle, rootPath);
    } catch {}
  };

  const openFile = async (file) => {
    setSelectedEntry(file);
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

  const readDir = async (handle, basePath) => {
    const ds = [];
    const fs = [];
    const parentPath = basePath || path[path.length - 1]?.path || '/';
    for await (const [name, h] of handle.entries()) {
      const entryPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
      const entry = { name, handle: h, path: entryPath };
      if (h.kind === 'file') fs.push(entry);
      else if (h.kind === 'directory') ds.push(entry);
    }
    setDirs(ds);
    setFiles(fs);
  };

  const openDir = async (dir) => {
    const parentPath = path[path.length - 1]?.path || '/';
    const fullPath = parentPath === '/' ? `/${dir.name}` : `${parentPath}/${dir.name}`;
    setDirHandle(dir.handle);
    setSelectedEntry(null);
    setCurrentFile(null);
    setPath((p) => [...p, { name: dir.name, handle: dir.handle, path: fullPath }]);
    await readDir(dir.handle, fullPath);
  };

  const navigateTo = async (index) => {
    const target = path[index];
    if (!target) return;
    setDirHandle(target.handle);
    setSelectedEntry(null);
    setCurrentFile(null);
    const nextPath = path.slice(0, index + 1);
    setPath(nextPath);
    await readDir(target.handle, target.path);
  };

  const goBack = async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setPath(newPath);
    setDirHandle(prev.handle);
    setSelectedEntry(null);
    setCurrentFile(null);
    await readDir(prev.handle, prev.path);
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

  const toggleFilterTag = (tag) => {
    setActiveTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      return [...prev, tag].sort((a, b) => a.localeCompare(b));
    });
  };

  const clearFilters = () => setActiveTags([]);

  const addTagToSelection = async (tag) => {
    if (!selectedEntry) return;
    await addTagToFile(PROFILE_ID, { path: selectedEntry.path, name: selectedEntry.name }, tag);
  };

  const removeTagFromSelection = async (tag) => {
    if (!selectedEntry) return;
    await removeTagFromFile(PROFILE_ID, selectedEntry.path, tag);
  };

  const handleSelectSavedSearch = (search) => {
    setActiveTags([...search.tags]);
  };

  const handleCreateSavedSearch = async ({ name, tags }) => {
    if (!tags.length) return;
    await createSavedSearch(PROFILE_ID, { name, tags });
  };

  const handleDeleteSavedSearch = async (id) => {
    await deleteSavedSearch(PROFILE_ID, id);
  };

  const filteredFiles = useMemo(() => {
    if (!activeTags.length || !metadata) return files;
    return files.filter((file) => {
      const entry = metadata.files[file.path];
      if (!entry) return false;
      return activeTags.every((tag) => entry.tags.includes(tag));
    });
  }, [files, activeTags, metadata]);

  const selectedPath = selectedEntry?.path || currentFile?.path || null;
  const selectedName = selectedEntry?.name || currentFile?.name || null;

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
        {currentFile && (
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          metadata={metadata}
          selectedPath={selectedPath}
          selectedName={selectedName}
          onAddTag={addTagToSelection}
          onRemoveTag={removeTagFromSelection}
          activeTags={activeTags}
          onToggleFilterTag={toggleFilterTag}
          onClearFilters={clearFilters}
          savedSearches={savedSearches}
          onSelectSavedSearch={handleSelectSavedSearch}
          onDeleteSavedSearch={handleDeleteSavedSearch}
          onCreateSavedSearch={handleCreateSavedSearch}
          activeSavedSearchId={activeSavedSearchId}
        />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 overflow-auto border-r border-black border-opacity-20 bg-black bg-opacity-20">
            <div className="p-2 font-bold">Recent</div>
            {recent.length === 0 && (
              <div className="px-2 text-xs text-white/60">No recent directories.</div>
            )}
            {recent.map((r, i) => (
              <div
                key={`${r.name}-${i}`}
                className="px-2 py-1 cursor-pointer rounded hover:bg-black hover:bg-opacity-40"
                onClick={() => openRecent(r)}
              >
                {r.name}
              </div>
            ))}
            <div className="p-2 font-bold">Directories</div>
            {dirs.length === 0 && (
              <div className="px-2 text-xs text-white/60">No subdirectories.</div>
            )}
            {dirs.map((d) => (
              <div
                key={d.path}
                className="px-2 py-1 cursor-pointer rounded hover:bg-black hover:bg-opacity-40"
                onClick={() => openDir(d)}
              >
                {d.name}
              </div>
            ))}
            <div className="p-2 font-bold">Files</div>
            {filteredFiles.length === 0 && (
              <div className="px-2 text-xs text-white/60">No files match the current filter.</div>
            )}
            {filteredFiles.map((f) => {
              const isSelected = selectedEntry?.path === f.path;
              return (
                <div
                  key={f.path}
                  className={`px-2 py-1 cursor-pointer rounded transition-colors ${
                    isSelected
                      ? 'bg-ubt-blue text-white'
                      : 'hover:bg-black hover:bg-opacity-40'
                  }`}
                  onClick={() => openFile(f)}
                >
                  {f.name}
                </div>
              );
            })}
          </div>
          <div className="flex-1 flex flex-col">
            {currentFile && (
              <textarea
                className="flex-1 p-2 bg-ub-cool-grey outline-none"
                value={content}
                onChange={onChange}
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
              <div className="max-h-40 overflow-auto mt-2 space-y-1">
                {results.map((r, i) => (
                  <div key={`${r.file}-${r.line}-${i}`}>
                    <span className="font-bold">{r.file}:{r.line}</span> {r.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
