"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';
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

const VirtualListOuter = React.forwardRef(function VirtualListOuter(
  { className = '', style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      style={style}
      className={className ? `overflow-y-auto ${className}` : 'overflow-y-auto'}
      data-testid="file-explorer-virtual-list"
      {...rest}
    />
  );
});

const ROW_HEIGHT = 32;

const ListRow = ({ index, style, data }) => {
  const item = data.items[index];
  const { openDir, openFile } = data;

  if (item.type === 'section') {
    return (
      <div
        style={{ ...style, display: 'flex', alignItems: 'center' }}
        className="px-2 py-1 font-bold text-xs uppercase tracking-wide text-gray-200 bg-black bg-opacity-20"
        data-testid="file-explorer-section"
      >
        {item.label}
      </div>
    );
  }

  const handleClick = () => {
    if (item.kind === 'directory') openDir(item);
    else openFile(item);
  };

  return (
    <div
      style={{ ...style, display: 'flex', alignItems: 'center' }}
      className="px-2 flex items-center cursor-pointer hover:bg-black hover:bg-opacity-30"
      onClick={handleClick}
      data-testid="file-explorer-item"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <span className="truncate" title={item.name}>
        {item.name}
      </span>
    </div>
  );
};

export default function FileExplorer() {
  const [supported, setSupported] = useState(true);
  const [dirHandle, setDirHandle] = useState(null);
  const [entries, setEntries] = useState([]);
  const [path, setPath] = useState([]);
  const [recent, setRecent] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
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
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      setDirHandle(entry.handle);
      setPath([{ name: entry.name, handle: entry.handle }]);
      await readDir(entry.handle);
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

  const readDir = async (handle) => {
    const dirs = [];
    const files = [];
    for await (const [name, h] of handle.entries()) {
      if (h.kind === 'directory') dirs.push({ name, handle: h, kind: 'directory' });
      else if (h.kind === 'file') files.push({ name, handle: h, kind: 'file' });
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    setEntries([...dirs, ...files]);
  };

  const openDir = async (dir) => {
    setDirHandle(dir.handle);
    setPath((p) => [...p, { name: dir.name, handle: dir.handle }]);
    await readDir(dir.handle);
  };

  const navigateTo = async (index) => {
    const target = path[index];
    if (!target) return;
    setDirHandle(target.handle);
    setPath(path.slice(0, index + 1));
    await readDir(target.handle);
  };

  const goBack = async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setPath(newPath);
    setDirHandle(prev.handle);
    await readDir(prev.handle);
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

  const filteredEntries = useMemo(() => {
    if (typeFilter === 'directory') return entries.filter((entry) => entry.kind === 'directory');
    if (typeFilter === 'file') return entries.filter((entry) => entry.kind === 'file');
    return entries;
  }, [entries, typeFilter]);

  const listItems = useMemo(() => {
    const sections = [];
    const dirs = filteredEntries.filter((entry) => entry.kind === 'directory');
    const files = filteredEntries.filter((entry) => entry.kind === 'file');

    if (typeFilter !== 'file' && dirs.length) {
      sections.push({ type: 'section', label: 'Folders', key: 'section-folders' });
      sections.push(
        ...dirs.map((entry, index) => ({ ...entry, key: `dir-${entry.name}-${index}` })),
      );
    }

    if (typeFilter !== 'directory' && files.length) {
      sections.push({ type: 'section', label: 'Files', key: 'section-files' });
      sections.push(
        ...files.map((entry, index) => ({ ...entry, key: `file-${entry.name}-${index}` })),
      );
    }
    return sections;
  }, [filteredEntries, typeFilter]);

  const itemKey = (index, data) => data.items[index].key || index;

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
        <div className="w-48 flex flex-col border-r border-gray-600 bg-black bg-opacity-20">
          <div className="max-h-40 overflow-auto border-b border-gray-600">
            <div className="sticky top-0 z-10 bg-ub-cool-grey bg-opacity-90 p-2 font-bold">Recent</div>
            {recent.length === 0 && (
              <div className="px-2 py-1 text-gray-300">No recent directories</div>
            )}
            {recent.map((r, i) => (
              <div
                key={i}
                className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
                onClick={() => openRecent(r)}
              >
                {r.name}
              </div>
            ))}
          </div>
          <div className="border-b border-gray-600 p-2 bg-black bg-opacity-30">
            <label htmlFor="file-type-filter" className="block text-xs uppercase tracking-wide text-gray-300">
              Type filter
            </label>
            <select
              id="file-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 w-full rounded bg-ub-cool-grey p-1 text-white"
            >
              <option value="all">All</option>
              <option value="file">Files</option>
              <option value="directory">Folders</option>
            </select>
          </div>
          <div className="flex-1 min-h-0">
            {listItems.length > 0 ? (
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    height={height}
                    width={width}
                    itemCount={listItems.length}
                    itemSize={ROW_HEIGHT}
                    itemData={{ items: listItems, openDir, openFile }}
                    itemKey={itemKey}
                    outerElementType={VirtualListOuter}
                  >
                    {ListRow}
                  </List>
                )}
              </AutoSizer>
            ) : (
              <div className="p-2 text-gray-300">No items</div>
            )}
          </div>
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
