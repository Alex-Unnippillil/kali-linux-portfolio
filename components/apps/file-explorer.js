import React, { useState, useEffect, useRef } from 'react';

const DB_NAME = 'file-explorer';
const STORE_NAME = 'recent';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getRecentDirs() {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function addRecentDir(handle) {
  try {
    const db = await openDB();
    const entry = { name: handle.name, handle };
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch {}
}

async function saveBuffer(name, content) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('unsaved', { create: true });
    const file = await dir.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
  } catch {}
}

async function loadBuffer(name) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('unsaved');
    const file = await dir.getFileHandle(name);
    const data = await file.getFile();
    return await data.text();
  } catch {
    return null;
  }
}

async function removeBuffer(name) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('unsaved');
    await dir.removeEntry(name);
  } catch {}
}

export default function FileExplorer() {
  const [supported, setSupported] = useState(true);
  const [dirHandle, setDirHandle] = useState(null);
  const [files, setFiles] = useState([]);
  const [recent, setRecent] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const workerRef = useRef(null);

  const hasWorker = typeof Worker !== 'undefined';
  const hasOPFS = !!navigator.storage?.getDirectory;

  useEffect(() => {
    const ok = !!window.showDirectoryPicker;
    setSupported(ok);
    if (ok) getRecentDirs().then(setRecent);
  }, []);

  const openFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirHandle(handle);
      addRecentDir(handle);
      setRecent(await getRecentDirs());
      const fs = [];
      for await (const [name, h] of handle.entries()) {
        if (h.kind === 'file') fs.push({ name, handle: h });
      }
      setFiles(fs);
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      setDirHandle(entry.handle);
      const fs = [];
      for await (const [name, h] of entry.handle.entries()) {
        if (h.kind === 'file') fs.push({ name, handle: h });
      }
      setFiles(fs);
    } catch {}
  };

  const openFile = async (file) => {
    setCurrentFile(file);
    let text = '';
    if (hasOPFS) {
      const unsaved = await loadBuffer(file.name);
      if (unsaved !== null) text = unsaved;
    }
    if (!text) {
      const f = await file.handle.getFile();
      text = await f.text();
    }
    setContent(text);
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (hasOPFS) await removeBuffer(currentFile.name);
    } catch {}
  };

  const onChange = (e) => {
    const text = e.target.value;
    setContent(text);
    if (hasOPFS && currentFile) saveBuffer(currentFile.name, text);
  };

  const runSearch = () => {
    if (!dirHandle || !hasWorker) return;
    setResults([]);
    if (workerRef.current) workerRef.current.terminate();
    workerRef.current = new Worker(new URL('./find.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { file, line, text, done } = e.data;
      if (done) {
        workerRef.current.terminate();
        workerRef.current = null;
      } else {
        setResults((r) => [...r, { file, line, text }]);
      }
    };
    workerRef.current.postMessage({ directoryHandle: dirHandle, query });
  };

  if (!supported) {
    return <div className="p-4">File System Access API not supported.</div>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm">
      <div className="flex space-x-2 p-2 bg-ub-warm-grey bg-opacity-40">
        <button onClick={openFolder} className="px-2 py-1 bg-black bg-opacity-50 rounded">Open Folder</button>
        {currentFile && (
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">Save</button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-40 overflow-auto border-r border-gray-600">
          <div className="p-2 font-bold">Recent</div>
          {recent.map((r, i) => (
            <div key={i} className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30" onClick={() => openRecent(r)}>
              {r.name}
            </div>
          ))}
          <div className="p-2 font-bold">Files</div>
          {files.map((f, i) => (
            <div key={i} className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30" onClick={() => openFile(f)}>
              {f.name}
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          {currentFile && (
            <textarea className="flex-1 p-2 bg-ub-cool-grey " value={content} onChange={onChange} />
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
