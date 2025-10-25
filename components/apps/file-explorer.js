"use client";

import React, { useEffect, useRef, useState } from 'react';
import useOPFS from '../../hooks/useOPFS';
import useFileSystemNavigator from '../../hooks/useFileSystemNavigator';
import { ensureHandlePermission } from '../../services/fileExplorer/permissions';
import Breadcrumbs from '../ui/Breadcrumbs';
import Modal from '../base/Modal';
import usePersistentState from '../../hooks/usePersistentState';

const AVAILABLE_EMBLEMS = [
  { id: 'star', icon: '⭐', label: 'Starred' },
  { id: 'heart', icon: '❤️', label: 'Favorite' },
  { id: 'work', icon: '💼', label: 'Work' },
  { id: 'important', icon: '⚠️', label: 'Important' },
];

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

export default function FileExplorer({ context, initialPath, path: pathProp } = {}) {
  const [supported, setSupported] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const workerRef = useRef(null);
  const fallbackInputRef = useRef(null);

  const [emblems, setEmblems] = usePersistentState(
    'file-explorer-emblems',
    {},
    (v) => v && typeof v === 'object'
  );
  const [showEmblems, setShowEmblems] = usePersistentState(
    'file-explorer-show-emblems',
    true,
    (v) => typeof v === 'boolean'
  );
  const [propFile, setPropFile] = useState(null);
  const [propTab, setPropTab] = useState('general');

  const hasWorker = typeof Worker !== 'undefined';
  const { 
    supported: opfsSupported,
    root,
    getDir,
    readFile: opfsRead,
    writeFile: opfsWrite,
    deleteFile: opfsDelete,
  } = useOPFS();
  const {
    currentDirectory: dirHandle,
    directories: dirs,
    files,
    breadcrumbs: path,
    recent,
    locationError,
    openHandle,
    enterDirectory,
    navigateTo,
    goBack: goBackNav,
    openPath,
    setLocationError,
  } = useFileSystemNavigator();
  const [unsavedDir, setUnsavedDir] = useState(null);

  const getPathKey = (name) => `${path.map((p) => p.name).join('/')}/${name}`;
  const iconFor = (id) => AVAILABLE_EMBLEMS.find((e) => e.id === id)?.icon;
  const openProps = (e, file, kind) => {
    e.preventDefault();
    const key = getPathKey(file.name);
    setPropFile({ ...file, kind, key });
    setPropTab('general');
  };
  const closeProps = () => setPropFile(null);
  const selectEmblem = (id) => {
    if (!propFile) return;
    setEmblems((prev) => {
      const next = { ...prev };
      if (!id) delete next[propFile.key];
      else next[propFile.key] = id;
      return next;
    });
  };

  useEffect(() => {
    const ok = !!window.showDirectoryPicker;
    setSupported(ok);
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    let active = true;
    (async () => {
      const unsaved = await getDir('unsaved');
      if (active) setUnsavedDir(unsaved);
      if (!active) return;
      await openHandle(root, { setAsRoot: true });
    })();
    return () => {
      active = false;
    };
  }, [opfsSupported, root, getDir, openHandle]);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    const requested =
      (context?.initialPath ?? context?.path ?? initialPath ?? pathProp) || '';
    if (!requested) return;
    openPath(requested);
  }, [context, initialPath, pathProp, opfsSupported, root, openPath]);

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
      const allowed = await ensureHandlePermission(handle);
      if (!allowed) {
        setLocationError('Permission required to open folder');
        return;
      }
      await openHandle(handle, { recordRecent: true });
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const allowed = await ensureHandlePermission(entry.handle);
      if (!allowed) return;
      await openHandle(entry.handle, { breadcrumbName: entry.name });
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

  const openDir = (dir) => {
    void enterDirectory(dir);
  };

  const navigateToBreadcrumb = (index) => {
    void navigateTo(index);
  };

  const goBack = () => {
    void goBackNav();
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
          <input
            ref={fallbackInputRef}
            type="file"
            onChange={openFallback}
            className="hidden"
            aria-label="Open file"
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
      <div className="flex items-center space-x-2 p-2 bg-ub-warm-grey bg-opacity-40">
        <button onClick={openFolder} className="px-2 py-1 bg-black bg-opacity-50 rounded">
          Open Folder
        </button>
        {path.length > 1 && (
          <button onClick={goBack} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Back
          </button>
        )}
        <Breadcrumbs path={path} onNavigate={navigateToBreadcrumb} />
        {locationError && (
          <div className="text-xs text-red-300" role="status">
            {locationError}
          </div>
        )}
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
                className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30 flex items-center"
                onClick={() => openDir(d)}
                onContextMenu={(e) => openProps(e, d, 'directory')}
              >
              {showEmblems && emblems[getPathKey(d.name)] && (
                <span className="mr-1">{iconFor(emblems[getPathKey(d.name)])}</span>
              )}
              {d.name}
            </div>
          ))}
          <div className="p-2 font-bold">Files</div>
          {files.map((f, i) => (
            <div
              key={i}
                className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30 flex items-center"
                onClick={() => openFile(f)}
                onContextMenu={(e) => openProps(e, f, 'file')}
              >
              {showEmblems && emblems[getPathKey(f.name)] && (
                <span className="mr-1">{iconFor(emblems[getPathKey(f.name)])}</span>
              )}
              {f.name}
            </div>
          ))}
          <div className="p-2 border-t border-gray-600">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={showEmblems}
                onChange={(e) => setShowEmblems(e.target.checked)}
                aria-label="Show emblems"
              />
              <span>Show emblems</span>
            </label>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {currentFile && (
            <textarea
              className="flex-1 p-2 bg-ub-cool-grey outline-none"
              value={content}
              onChange={onChange}
              aria-label="File contents"
            />
          )}
          <div className="p-2 border-t border-gray-600">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find in files"
                className="px-1 py-0.5 text-black"
                aria-label="Search query"
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
      {propFile && (
        <Modal isOpen={!!propFile} onClose={closeProps}>
          <div className="bg-ub-cool-grey text-white p-4 rounded shadow-lg min-w-[250px]">
            <div className="mb-2 flex space-x-2 border-b border-gray-600 pb-1">
              <button
                className={propTab === 'general' ? 'font-bold' : ''}
                onClick={() => setPropTab('general')}
              >
                General
              </button>
              <button
                className={propTab === 'emblems' ? 'font-bold' : ''}
                onClick={() => setPropTab('emblems')}
              >
                Emblems
              </button>
            </div>
            {propTab === 'general' && <div>Name: {propFile.name}</div>}
            {propTab === 'emblems' && (
              <div className="flex space-x-2">
                {AVAILABLE_EMBLEMS.map((em) => (
                  <button
                    key={em.id}
                    onClick={() => selectEmblem(em.id)}
                    className={`text-2xl ${
                      emblems[propFile.key] === em.id
                        ? 'ring-2 ring-blue-500 rounded'
                        : ''
                    }`}
                    aria-label={em.label}
                  >
                    {em.icon}
                  </button>
                ))}
                <button
                  onClick={() => selectEmblem(null)}
                  className={`px-1 border ${
                    !emblems[propFile.key] ? 'border-blue-500' : ''
                  }`}
                >
                  None
                </button>
              </div>
            )}
            <div className="mt-4 text-right">
              <button
                onClick={closeProps}
                className="px-2 py-1 bg-black bg-opacity-50 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
