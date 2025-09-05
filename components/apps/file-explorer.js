"use client";

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
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

export default function FileExplorer({ openApp }) {
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
  const [contextMenu, setContextMenu] = useState(null);
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
    const ds = [];
    const fs = [];
    for await (const [name, h] of handle.entries()) {
      if (h.kind === 'file') fs.push({ name, handle: h });
      else if (h.kind === 'directory') ds.push({ name, handle: h });
    }
    setDirs(ds);
    setFiles(fs);
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
  const openContextMenu = async (e, item) => {
    e.preventDefault();
    let type = '';
    if (item.handle.kind === 'file') {
      try {
        const f = await item.handle.getFile();
        type = f.type;
      } catch {}
    }
    setContextMenu({ x: e.clientX, y: e.clientY, item: { ...item, type }, tab: 'actions' });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handler = () => closeContextMenu();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matchesPattern = (pattern, name) => {
    const regex = new RegExp('^' + pattern.split('*').map(escapeRegExp).join('.*') + '$', 'i');
    return regex.test(name);
  };

  const matches = (action, item) => {
    if (action.kind && action.kind !== item.handle.kind) return false;
    if (action.patterns?.length && !action.patterns.some((p) => matchesPattern(p, item.name))) return false;
    if (action.mimes?.length && !action.mimes.includes(item.type)) return false;
    return true;
  };

  const actions = [
    {
      id: 'open-terminal',
      label: 'Open Terminal Here',
      kind: 'directory',
      patterns: [],
      mimes: [],
      run: () => openApp && openApp('terminal'),
    },
    {
      id: 'sha256',
      label: 'SHA256 checksum',
      kind: 'file',
      patterns: [],
      mimes: [],
      run: async (item) => {
        const file = await item.handle.getFile();
        const buf = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        alert(hashHex);
      },
    },
    {
      id: 'extract',
      label: 'Extract Here',
      kind: 'file',
      patterns: ['*.zip'],
      mimes: ['application/zip'],
      run: async (item) => {
        const file = await item.handle.getFile();
        const data = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(data);
        for (const [name, entry] of Object.entries(zip.files)) {
          if (entry.dir) continue;
          const content = await entry.async('arraybuffer');
          let current = dirHandle;
          const parts = name.split('/');
          const base = parts.pop();
          for (const part of parts) {
            current = await current.getDirectoryHandle(part, { create: true });
          }
          const fh = await current.getFileHandle(base, { create: true });
          const writable = await fh.createWritable();
          await writable.write(content);
          await writable.close();
        }
        await readDir(dirHandle);
      },
    },
  ];

  const availableActions = contextMenu
    ? actions.filter((a) => matches(a, contextMenu.item))
    : [];

  const runAction = async (action) => {
    await action.run(contextMenu.item);
    closeContextMenu();
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
                onContextMenu={(e) => openContextMenu(e, d)}
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
                onContextMenu={(e) => openContextMenu(e, f)}
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
      {contextMenu && (
        <div
          className="absolute bg-black bg-opacity-80 text-white rounded shadow-md text-sm z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex border-b border-gray-700">
            <button
              className={`px-2 py-1 ${contextMenu.tab === 'actions' ? 'bg-gray-700' : ''}`}
              onClick={() => setContextMenu({ ...contextMenu, tab: 'actions' })}
            >
              Actions
            </button>
            <button
              className={`px-2 py-1 ${contextMenu.tab === 'conditions' ? 'bg-gray-700' : ''}`}
              onClick={() => setContextMenu({ ...contextMenu, tab: 'conditions' })}
            >
              Conditions
            </button>
          </div>
          {contextMenu.tab === 'actions' ? (
            availableActions.map((a) => (
              <div
                key={a.id}
                className="px-2 py-1 cursor-pointer hover:bg-white hover:bg-opacity-20"
                onClick={() => runAction(a)}
              >
                {a.label}
              </div>
            ))
          ) : (
            availableActions.map((a) => (
              <div key={a.id} className="px-2 py-1 border-b border-gray-700 last:border-b-0">
                {a.patterns.length > 0 && <div>Patterns: {a.patterns.join(', ')}</div>}
                {a.mimes.length > 0 && <div>MIME: {a.mimes.join(', ')}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
