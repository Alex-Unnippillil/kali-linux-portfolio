"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useOPFS from '../../hooks/useOPFS';
import useFileSystemNavigator from '../../hooks/useFileSystemNavigator';
import { ensureHandlePermission } from '../../services/fileExplorer/permissions';
import Breadcrumbs from '../ui/Breadcrumbs';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { DEFAULT_HOME_PATH, useFileSystemStore } from '../../stores/fileSystemStore';

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
  const [nativeSupported, setNativeSupported] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const workerRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const [vfsPath, setVfsPath] = useState(context?.vfsPath || DEFAULT_HOME_PATH);

  const hasWorker = typeof Worker !== 'undefined';
  const vfsTree = useFileSystemStore((state) => state.tree);
  const listDirectory = useFileSystemStore((state) => state.listDirectory);
  const readFile = useFileSystemStore((state) => state.readFile);
  const writeFile = useFileSystemStore((state) => state.writeFile);
  const getEntry = useFileSystemStore((state) => state.getEntry);
  const resolvePath = useFileSystemStore((state) => state.resolvePath);
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
  const vfsEnabled = !nativeSupported || Boolean(context?.useVfs);
  const vfsEntries = useMemo(
    () => (vfsEnabled ? listDirectory(vfsPath) : []),
    [vfsEnabled, listDirectory, vfsPath, vfsTree],
  );

  const hasUnsavedChanges = useMemo(
    () => currentFile && content !== savedContent,
    [content, currentFile, savedContent],
  );

  useEffect(() => {
    const ok = !!window.showDirectoryPicker;
    setNativeSupported(ok);
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

  useEffect(() => {
    if (!vfsEnabled) return;
    const target = context?.vfsPath;
    if (!target) return;
    const resolved = resolvePath(target, vfsPath);
    const entry = getEntry(resolved);
    if (!entry) return;
    if (entry.type === 'directory') {
      setVfsPath(resolved);
      return;
    }
    if (entry.type === 'file') {
      const parent = resolved.split('/').slice(0, -1).join('/') || '/';
      setVfsPath(parent);
      openVfsFileByPath(resolved);
    }
  }, [context?.vfsPath, getEntry, openVfsFileByPath, resolvePath, vfsEnabled, vfsPath]);

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
    setSavedContent(text);
    setPreviewData(buildPreview(file.name, file, text));
  };

  const openFolder = async () => {
    const proceed = await ensureSaved();
    if (!proceed) return;
    try {
      const handle = await window.showDirectoryPicker();
      const allowed = await ensureHandlePermission(handle);
      if (!allowed) {
        setLocationError('Permission denied while opening folder. Please allow access in the browser prompt.');
        return;
      }
      await openHandle(handle, { recordRecent: true });
    } catch (error) {
      const message =
        error?.name === 'NotAllowedError'
          ? 'Folder access was blocked. Re-run and grant permission to continue.'
          : 'Unable to open folder. Please check your browser permissions.';
      setLocationError(message);
    }
  };

  const openRecent = async (entry) => {
    const proceed = await ensureSaved();
    if (!proceed) return;
    try {
      const allowed = await ensureHandlePermission(entry.handle);
      if (!allowed) {
        setLocationError('Permission denied for this recent location. Please re-authorize access.');
        return;
      }
      await openHandle(entry.handle, { breadcrumbName: entry.name });
    } catch (error) {
      setLocationError(
        error?.name === 'NotAllowedError'
          ? 'Access to this location was blocked. Try reopening and granting permission.'
          : 'Unable to reopen recent location.',
      );
    }
  };

  const readFileContent = async (fileHandle, streamToUI = true) => {
    const file = await fileHandle.getFile();
    if (!file.stream) {
      return { text: await file.text(), file };
    }

    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let text = '';
    let chunkCount = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      chunkCount += 1;
      if (chunkCount % 8 === 0 && streamToUI) {
        setContent(text);
      }
    }
    text += decoder.decode();
    return { text, file };
  };

  const buildPreview = (fileName, file, text) => {
    const lower = fileName.toLowerCase();
    if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
      return { type: 'image', url: URL.createObjectURL(file) };
    }
    if (lower.endsWith('.json')) {
      try {
        const parsed = JSON.parse(text);
        return { type: 'json', text: JSON.stringify(parsed, null, 2) };
      } catch {
        return { type: 'text', text };
      }
    }
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
      const html = DOMPurify.sanitize(marked.parse(text));
      return { type: 'markdown', html };
    }
    return { type: 'text', text };
  };

  const openVfsFileByPath = useCallback(
    (filePath) => {
      const resolved = resolvePath(filePath, vfsPath);
      const result = readFile(resolved);
      if (!result.ok) {
        setLocationError(result.message || 'Unable to open file.');
        return;
      }
      const fileName = resolved.split('/').pop() || 'untitled';
      setCurrentFile({ name: fileName, path: resolved });
      setContent(result.content || '');
      setSavedContent(result.content || '');
      setPreviewData(buildPreview(fileName, new Blob([result.content || '']), result.content || ''));
    },
    [readFile, resolvePath, vfsPath, setLocationError],
  );

  const ensureSaved = async () => {
    if (!hasUnsavedChanges) return true;
    const shouldSave = window.confirm(
      'You have unsaved changes. Click OK to save before continuing, or Cancel to stay on this file.',
    );
    if (!shouldSave) return false;
    await saveFile();
    return true;
  };

  const openFile = async (file) => {
    const proceed = await ensureSaved();
    if (!proceed) return;
    setCurrentFile(file);
    setPreviewData(null);
    setContent('');
    setSavedContent('');
    let text = '';
    if (opfsSupported) {
      const unsaved = await loadBuffer(file.name);
      if (unsaved !== null) text = unsaved;
    }
    try {
      setLoading(true);
      const { text: streamed, file: fetched } = await readFileContent(file.handle, !text);
      if (!text) {
        text = streamed;
      }
      setPreviewData(buildPreview(file.name, fetched, text));
      setContent(text);
      setSavedContent(streamed);
    } catch (error) {
      const message =
        error?.name === 'NotAllowedError'
          ? 'Permission denied while opening file. Please allow access and retry.'
          : 'Unable to open file. The handle may no longer be available.';
      setLocationError(message);
    } finally {
      setLoading(false);
    }
  };

  const openDir = (dir) => {
    void (async () => {
      const proceed = await ensureSaved();
      if (proceed) enterDirectory(dir);
    })();
  };

  const navigateToBreadcrumb = (index) => {
    void (async () => {
      const proceed = await ensureSaved();
      if (proceed) navigateTo(index);
    })();
  };

  const goBack = () => {
    void (async () => {
      const proceed = await ensureSaved();
      if (proceed) goBackNav();
    })();
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile.name);
      setSavedContent(content);
    } catch (error) {
      setLocationError(
        error?.name === 'NotAllowedError'
          ? 'Save permission denied. Please allow file writes in the browser prompt.'
          : 'Failed to save file.',
      );
    }
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

  useEffect(() => () => {
    if (previewData?.type === 'image' && previewData.url) {
      URL.revokeObjectURL(previewData.url);
    }
  }, [previewData]);

  if (!nativeSupported && !vfsEnabled) {
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
                aria-label="File content"
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

  if (vfsEnabled) {
    const breadcrumbs = vfsPath
      .split('/')
      .filter(Boolean)
      .reduce((acc, segment) => {
        const prev = acc.length ? acc[acc.length - 1].path : '';
        const nextPath = `${prev}/${segment}`;
        acc.push({ name: segment, path: nextPath });
        return acc;
      }, [{ name: '/', path: '' }]);

    const openVfsFile = async (entry) => {
      if (!entry) return;
      const filePath = `${vfsPath.replace(/\/$/, '')}/${entry.name}`;
      openVfsFileByPath(filePath);
    };

    const openVfsDir = (entry) => {
      if (!entry) return;
      setCurrentFile(null);
      setContent('');
      setSavedContent('');
      setPreviewData(null);
      setVfsPath(`${vfsPath.replace(/\/$/, '')}/${entry.name}`);
    };

    const navigateVfsBreadcrumb = (index) => {
      if (index === 0) {
        setCurrentFile(null);
        setContent('');
        setSavedContent('');
        setPreviewData(null);
        setVfsPath('/');
        return;
      }
      const target = breadcrumbs[index];
      if (target) {
        setCurrentFile(null);
        setContent('');
        setSavedContent('');
        setPreviewData(null);
        setVfsPath(target.path || '/');
      }
    };

    const saveVfsFile = () => {
      if (!currentFile?.path) return;
      const result = writeFile(currentFile.path, content);
      if (!result.ok) {
        setLocationError(result.message || 'Failed to save file.');
        return;
      }
      setSavedContent(content);
    };

    return (
      <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm">
        <div className="flex items-center space-x-2 p-2 bg-ub-warm-grey bg-opacity-40">
          <button
            onClick={() => setVfsPath(DEFAULT_HOME_PATH)}
            className="px-2 py-1 bg-black bg-opacity-50 rounded"
          >
            Home
          </button>
          <Breadcrumbs
            path={breadcrumbs.map((crumb) => ({ name: crumb.name }))}
            onNavigate={navigateVfsBreadcrumb}
          />
          {locationError && (
            <div className="text-xs text-red-300" role="status">
              {locationError}
            </div>
          )}
          {currentFile && (
            <div className="flex items-center space-x-2 ml-auto">
              {hasUnsavedChanges && (
                <span className="text-xs text-yellow-200" aria-live="polite">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={saveVfsFile}
                disabled={!hasUnsavedChanges}
                className={`px-2 py-1 rounded ${
                  hasUnsavedChanges
                    ? 'bg-green-700 hover:bg-green-600'
                    : 'bg-black bg-opacity-40 cursor-not-allowed'
                }`}
              >
                {hasUnsavedChanges ? 'Save changes' : 'Saved'}
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-40 overflow-auto border-r border-gray-600">
            <div className="p-2 font-bold">Directories</div>
            {vfsEntries.filter((entry) => entry.type === 'directory').map((entry, i) => (
              <div
                key={`${entry.name}-${i}`}
                className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
                onClick={() => openVfsDir(entry)}
              >
                {entry.name}
              </div>
            ))}
            <div className="p-2 font-bold">Files</div>
            {vfsEntries.filter((entry) => entry.type === 'file').map((entry, i) => (
              <div
                key={`${entry.name}-${i}`}
                className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
                onClick={() => openVfsFile(entry)}
              >
                {entry.name}
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col">
            {currentFile && (
              <div className="flex flex-col flex-1 overflow-auto">
                <div className="flex items-center justify-between px-2 py-1 border-b border-gray-600 bg-black bg-opacity-20">
                  <div className="font-semibold">{currentFile.name}</div>
                  {loading && <div className="text-xs text-gray-300">Loading...</div>}
                </div>
                {previewData && (
                  <div className="p-2 border-b border-gray-700 overflow-auto max-h-64 bg-black bg-opacity-20">
                    {previewData.type === 'image' && (
                      <img src={previewData.url} alt={`${currentFile.name} preview`} className="max-h-60 mx-auto" />
                    )}
                    {previewData.type === 'json' && (
                      <pre className="whitespace-pre-wrap text-xs bg-black bg-opacity-30 p-2 rounded">{previewData.text}</pre>
                    )}
                    {previewData.type === 'markdown' && (
                      <div
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: previewData.html }}
                      />
                    )}
                  </div>
                )}
                <textarea
                  className="flex-1 p-2 bg-ub-cool-grey outline-none"
                  value={content}
                  onChange={onChange}
                  aria-label="File content"
                />
              </div>
            )}
          </div>
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
        <Breadcrumbs path={path} onNavigate={navigateToBreadcrumb} />
        {locationError && (
          <div className="text-xs text-red-300" role="status">
            {locationError}
          </div>
        )}
        {currentFile && (
          <div className="flex items-center space-x-2 ml-auto">
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-200" aria-live="polite">
                Unsaved changes
              </span>
            )}
            <button
              onClick={saveFile}
              disabled={!hasUnsavedChanges}
              className={`px-2 py-1 rounded ${
                hasUnsavedChanges
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-black bg-opacity-40 cursor-not-allowed'
              }`}
            >
              {hasUnsavedChanges ? 'Save changes' : 'Saved'}
            </button>
          </div>
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
          {currentFile && (
            <div className="flex flex-col flex-1 overflow-auto">
              <div className="flex items-center justify-between px-2 py-1 border-b border-gray-600 bg-black bg-opacity-20">
                <div className="font-semibold">{currentFile.name}</div>
                {loading && <div className="text-xs text-gray-300">Loading...</div>}
              </div>
              {previewData && (
                <div className="p-2 border-b border-gray-700 overflow-auto max-h-64 bg-black bg-opacity-20">
                  {previewData.type === 'image' && (
                    <img src={previewData.url} alt={`${currentFile.name} preview`} className="max-h-60 mx-auto" />
                  )}
                  {previewData.type === 'json' && (
                    <pre className="whitespace-pre-wrap text-xs bg-black bg-opacity-30 p-2 rounded">{previewData.text}</pre>
                  )}
                  {previewData.type === 'markdown' && (
                    <div
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewData.html }}
                    />
                  )}
                </div>
              )}
              <textarea
                className="flex-1 p-2 bg-ub-cool-grey outline-none"
                value={content}
                onChange={onChange}
                aria-label="File content"
              />
            </div>
          )}
          <div className="p-2 border-t border-gray-600">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find in files"
              className="px-1 py-0.5 text-black"
              aria-label="Find in files"
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
