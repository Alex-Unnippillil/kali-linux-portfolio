"use client";

import React, { useState, useEffect, useRef } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import FilePreviewPane from './file-explorer/previewers/FilePreviewPane';
import { MAX_PREVIEW_SIZE } from './file-explorer/previewers/constants';

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

const JSON_EXTENSIONS = new Set(['json', 'geojson', 'har', 'jsonl']);
const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'log',
  'csv',
  'xml',
  'html',
  'htm',
  'css',
  'js',
  'ts',
  'tsx',
  'jsx',
  'yml',
  'yaml',
  'ini',
  'cfg',
  'conf',
  'py',
  'sh',
  'c',
  'cpp',
  'rs',
  'go',
  'java',
  'rb',
  'php',
  'sql',
]);
const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'svg',
  'ico',
  'avif',
  'heic',
  'heif',
]);
const JSON_MIME_TYPES = new Set(['application/json', 'application/ld+json']);
const TEXT_MIME_TYPES = new Set([
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/x-sh',
  'application/sql',
]);

function getExtension(name) {
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) return '';
  return name.slice(lastDot + 1).toLowerCase();
}

function getPreviewType(mimeType, extension) {
  if (JSON_MIME_TYPES.has(mimeType) || JSON_EXTENSIONS.has(extension)) {
    return 'json';
  }
  if (mimeType?.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  if (mimeType?.startsWith('text/')) {
    return 'text';
  }
  if (TEXT_MIME_TYPES.has(mimeType) || TEXT_EXTENSIONS.has(extension)) {
    return 'text';
  }
  return 'unsupported';
}

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
  const [content, setContent] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const workerRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const previewTokenRef = useRef(0);
  const imageUrlRef = useRef(null);

  const hasWorker = typeof Worker !== 'undefined';
  const { supported: opfsSupported, root } = useOPFS();

  useEffect(() => {
    const ok = !!window.showDirectoryPicker;
    setSupported(ok);
    if (ok) getRecentDirs().then(setRecent);
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    (async () => {
      setDirHandle(root);
      setPath([{ name: root.name || '/', handle: root }]);
      await readDir(root);
    })();
  }, [opfsSupported, root]);

  const loadPreview = async ({ name, getFile, handle }) => {
    const token = previewTokenRef.current + 1;
    previewTokenRef.current = token;
    setLoadingPreview(true);
    setCurrentFile(null);
    setContent(null);
    setImageSrc(null);

    try {
      const fileObject = await getFile();
      const mimeType = fileObject.type || '';
      const extension = getExtension(name);
      const previewType = getPreviewType(mimeType, extension);
      const tooLarge = fileObject.size > MAX_PREVIEW_SIZE;

      if (previewTokenRef.current !== token) return;

      const nextFile = {
        name,
        handle,
        file: fileObject,
        type: mimeType,
        size: fileObject.size,
        extension,
        previewType,
        tooLarge,
      };

      setCurrentFile(nextFile);

      if (tooLarge || previewType === 'unsupported') {
        return;
      }

      if (previewType === 'image') {
        const url = URL.createObjectURL(fileObject);
        if (previewTokenRef.current === token) {
          setImageSrc(url);
        } else {
          URL.revokeObjectURL(url);
        }
        return;
      }

      const text = await fileObject.text();
      if (previewTokenRef.current === token) {
        setContent(text);
      }
    } catch {
      if (previewTokenRef.current === token) {
        setCurrentFile(null);
      }
    } finally {
      if (previewTokenRef.current === token) {
        setLoadingPreview(false);
      }
    }
  };

  const openFallback = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await loadPreview({ name: file.name, handle: null, getFile: async () => file });
    e.target.value = '';
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
    await loadPreview({
      name: file.name,
      handle: file.handle,
      getFile: () => file.handle.getFile(),
    });
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

  const openExternally = async () => {
    if (!currentFile) return;
    try {
      const blob =
        currentFile.file ||
        (currentFile.handle && (await currentFile.handle.getFile()));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        URL.revokeObjectURL(url);
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch {}
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
    const previous = imageUrlRef.current;
    if (previous && previous !== imageSrc) {
      URL.revokeObjectURL(previous);
    }
    imageUrlRef.current = imageSrc || null;
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, [imageSrc]);

  if (!supported) {
    return (
      <div className="p-4 flex flex-col h-full space-y-4">
        <input ref={fallbackInputRef} type="file" onChange={openFallback} className="hidden" />
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fallbackInputRef.current?.click()}
            className="px-2 py-1 bg-black bg-opacity-50 rounded"
          >
            Open File
          </button>
          {currentFile && (
            <button
              onClick={openExternally}
              disabled={loadingPreview}
              className="px-2 py-1 bg-black bg-opacity-50 rounded disabled:opacity-50"
            >
              Open externally
            </button>
          )}
        </div>
        <div className="flex-1 overflow-hidden border border-gray-600 rounded bg-ub-cool-grey">
          <FilePreviewPane
            currentFile={currentFile}
            content={content}
            imageSrc={imageSrc}
            loading={loadingPreview}
          />
        </div>
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
          <button
            onClick={openExternally}
            disabled={loadingPreview}
            className="px-2 py-1 bg-black bg-opacity-50 rounded disabled:opacity-50"
          >
            Open externally
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
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden bg-ub-cool-grey">
            <FilePreviewPane
              currentFile={currentFile}
              content={content}
              imageSrc={imageSrc}
              loading={loadingPreview}
            />
          </div>
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
