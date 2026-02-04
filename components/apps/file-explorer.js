"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useOPFS from '../../hooks/useOPFS';
import useFileSystemNavigator from '../../hooks/useFileSystemNavigator';
import { ensureHandlePermission } from '../../services/fileExplorer/permissions';
import {
  findNodeByPathIds,
  findNodeByPathNames,
  listDirectory,
  loadFauxFileSystem,
  moveEntry,
  saveFauxFileSystem,
  searchFiles,
  updateFileContent,
} from '../../services/fileExplorer/fauxFileSystem';
import Breadcrumbs from '../ui/Breadcrumbs';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

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
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [fauxTree, setFauxTree] = useState(null);
  const [fauxPathIds, setFauxPathIds] = useState(['root']);
  const [fauxDirectories, setFauxDirectories] = useState([]);
  const [fauxFiles, setFauxFiles] = useState([]);
  const [fauxBreadcrumbs, setFauxBreadcrumbs] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [searchStatus, setSearchStatus] = useState('idle');
  const [searchProgress, setSearchProgress] = useState({ scanned: 0, skipped: 0 });
  const workerRef = useRef(null);

  const hasWorker = typeof Worker !== 'undefined';
  const {
    supported: opfsSupported,
    root,
    getDir,
    readFile: opfsRead,
    writeFile: opfsWrite,
    deleteFile: opfsDelete,
  } = useOPFS();

  const canUseDirectoryHandles =
    typeof FileSystemDirectoryHandle !== 'undefined' &&
    (typeof FileSystemDirectoryHandle.prototype.entries === 'function' ||
      typeof FileSystemDirectoryHandle.prototype.values === 'function');
  const canPickExternalFolder =
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  const canUseFileSystem = opfsSupported || canUseDirectoryHandles;
  const isFauxMode = !canUseFileSystem;
  const canOpenExternal = canPickExternalFolder && canUseDirectoryHandles;
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

  const hasUnsavedChanges = useMemo(
    () => currentFile && content !== savedContent,
    [content, currentFile, savedContent],
  );

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

  const syncFauxDirectory = useCallback((tree, pathIds = ['root']) => {
    if (!tree) return;
    const nodes = findNodeByPathIds(tree, pathIds);
    const current = nodes[nodes.length - 1];
    if (!current) return;
    const { directories, files: fauxFilesList } = listDirectory(current);
    setFauxDirectories(directories);
    setFauxFiles(fauxFilesList);
    setFauxBreadcrumbs(
      nodes.map((node) => ({ name: node.name, id: node.id })),
    );
  }, []);

  useEffect(() => {
    if (!isFauxMode) return;
    const tree = loadFauxFileSystem();
    const requested =
      (context?.initialPath ?? context?.path ?? initialPath ?? pathProp) || '';
    const pathIds = requested
      ? findNodeByPathNames(tree, requested.split('/'))
      : ['root'];
    setFauxTree(tree);
    setFauxPathIds(pathIds);
    syncFauxDirectory(tree, pathIds);
  }, [isFauxMode, context, initialPath, pathProp, syncFauxDirectory]);

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

  const openFolder = async () => {
    if (!canOpenExternal) {
      setLocationError('This browser cannot open external folders. Use the built-in workspace instead.');
      return;
    }
    const proceed = await ensureSaved();
    if (!proceed) return;
    try {
      const handle = await window.showDirectoryPicker();
      const allowed = await ensureHandlePermission(handle);
      if (!allowed) {
        setLocationError('Permission denied while opening folder. Please allow access in the browser prompt.');
        return;
      }
      await openHandle(handle, { recordRecent: true, setAsRoot: true });
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
      await openHandle(entry.handle, { breadcrumbName: entry.name, setAsRoot: true });
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

  const buildPreview = (fileName, file, text, options = {}) => {
    const lower = fileName.toLowerCase();
    const directUrl = typeof options.url === 'string' ? options.url : null;
    if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
      if (directUrl) {
        return { type: 'image', url: directUrl };
      }
      return { type: 'image', url: URL.createObjectURL(file) };
    }
    if (lower.endsWith('.pdf')) {
      if (directUrl) {
        return { type: 'pdf', url: directUrl };
      }
      return null;
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
    if (directUrl) {
      return { type: 'link', url: directUrl };
    }
    return { type: 'text', text };
  };

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

  const openFauxFile = async (file) => {
    const proceed = await ensureSaved();
    if (!proceed) return;
    setCurrentFile({ ...file, virtual: true });
    setPreviewData(null);
    setContent('');
    setSavedContent('');
    const text = file?.content ?? '';
    setContent(text);
    setSavedContent(text);
    setPreviewData(buildPreview(file.name, null, text, { url: file.url }));
  };

  const openFauxDir = (dir) => {
    void (async () => {
      const proceed = await ensureSaved();
      if (!proceed || !fauxTree) return;
      const nextPath = [...fauxPathIds, dir.id];
      setFauxPathIds(nextPath);
      syncFauxDirectory(fauxTree, nextPath);
    })();
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
      if (!proceed) return;
      if (supported) {
        goBackNav();
        return;
      }
      if (!fauxTree || fauxPathIds.length <= 1) return;
      const nextPath = fauxPathIds.slice(0, -1);
      setFauxPathIds(nextPath);
      syncFauxDirectory(fauxTree, nextPath);
    })();
  };

  const saveFile = async () => {
    if (!currentFile) return;
    if (currentFile.virtual) {
      if (!fauxTree) return;
      const nextTree = updateFileContent(fauxTree, fauxPathIds, currentFile.id, content);
      setFauxTree(nextTree);
      saveFauxFileSystem(nextTree);
      setSavedContent(content);
      return;
    }
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
    if (opfsSupported && currentFile && !currentFile.virtual) saveBuffer(currentFile.name, text);
  };

  const runSearch = () => {
    if (isFauxMode) {
      if (!fauxTree) return;
      setSearchStatus('done');
      setSearchProgress({ scanned: 0, skipped: 0 });
      const matches = searchFiles(fauxTree, query);
      setResults(
        matches.map((match) => ({
          kind: 'faux',
          path: match.path,
          name: match.file.name,
          id: match.file.id,
        })),
      );
      return;
    }
    if (!dirHandle || !hasWorker) return;
    setSearchStatus('searching');
    setSearchProgress({ scanned: 0, skipped: 0 });
    setResults([]);
    if (workerRef.current) workerRef.current.terminate();
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./find.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const payload = e.data;
        if (!payload) return;
        if (payload.type === 'result') {
          setResults((r) => [...r, { file: payload.file, line: payload.line, text: payload.text }]);
        }
        if (payload.type === 'progress') {
          setSearchProgress({ scanned: payload.scanned ?? 0, skipped: payload.skipped ?? 0 });
        }
        if (payload.type === 'done') {
          setSearchProgress({ scanned: payload.scanned ?? 0, skipped: payload.skipped ?? 0 });
          setSearchStatus(payload.cancelled ? 'idle' : 'done');
          workerRef.current?.terminate();
          workerRef.current = null;
        }
      };
      workerRef.current.postMessage({
        directoryHandle: dirHandle,
        query,
        options: {
          caseSensitive: false,
          allowLargeFiles: false,
          maxFileSizeBytes: 1024 * 1024,
          skipBinary: true,
        },
      });
    }
  };

  const stopSearch = () => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'cancel' });
    setSearchStatus('cancelling');
  };

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => () => {
    if (previewData?.type === 'image' && previewData.url) {
      if (previewData.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewData.url);
      }
    }
  }, [previewData]);

  const activeDirs = isFauxMode ? fauxDirectories : dirs;
  const activeFiles = isFauxMode ? fauxFiles : files;
  const activeBreadcrumbs = isFauxMode ? fauxBreadcrumbs : path;

  const handleFauxDrop = (targetDirId) => {
    if (!fauxTree || !dragState) return;
    if (!targetDirId || targetDirId === dragState.id) return;
    const targetPath = [...fauxPathIds, targetDirId];
    const nextTree = moveEntry(fauxTree, dragState.sourcePath, dragState.id, targetPath);
    setFauxTree(nextTree);
    saveFauxFileSystem(nextTree);
    syncFauxDirectory(nextTree, fauxPathIds);
    setDragState(null);
  };

  const openExternal = (url) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm">
      <div className="flex items-center space-x-2 p-2 bg-ub-warm-grey bg-opacity-40">
        <button
          onClick={isFauxMode
            ? () => {
                if (!fauxTree) return;
                setFauxPathIds(['root']);
                syncFauxDirectory(fauxTree, ['root']);
              }
            : openFolder}
          className={`px-2 py-1 rounded ${
            isFauxMode || canOpenExternal
              ? 'bg-black bg-opacity-50'
              : 'bg-black bg-opacity-30 cursor-not-allowed'
          }`}
          disabled={!isFauxMode && !canOpenExternal}
        >
          {isFauxMode ? 'Go Home' : 'Open Folder'}
        </button>
        {activeBreadcrumbs.length > 1 && (
          <button onClick={goBack} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Back
          </button>
        )}
        <Breadcrumbs
          path={activeBreadcrumbs}
          onNavigate={(index) => {
            if (isFauxMode) {
              if (!fauxTree) return;
              const nextPath = fauxPathIds.slice(0, index + 1);
              setFauxPathIds(nextPath);
              syncFauxDirectory(fauxTree, nextPath);
            } else {
              navigateToBreadcrumb(index);
            }
          }}
        />
        {locationError && (
          <div className="text-xs text-red-300" role="status">
            {locationError}
          </div>
        )}
        {isFauxMode && (
          <div className="text-xs text-sky-200">Demo file system</div>
        )}
        {!isFauxMode && opfsSupported && (
          <div className="text-xs text-sky-200">Workspace mode</div>
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
              disabled={!hasUnsavedChanges || (currentFile.virtual && currentFile.url)}
              className={`px-2 py-1 rounded ${
                hasUnsavedChanges && !(currentFile.virtual && currentFile.url)
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-black bg-opacity-40 cursor-not-allowed'
              }`}
            >
              {currentFile.virtual && currentFile.url
                ? 'Read-only'
                : hasUnsavedChanges
                  ? 'Save changes'
                  : 'Saved'}
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-40 overflow-auto border-r border-gray-600">
          <div className="p-2 font-bold">Recent</div>
          {isFauxMode
            ? (
              <div className="px-2 text-xs text-slate-300">
                Recents are available in real file mode.
              </div>
            )
            : recent.map((r) => (
                <div
                  key={r.id}
                  className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
                  onClick={() => openRecent(r)}
                >
                  {r.name}
                </div>
              ))}
          <div className="p-2 font-bold">Directories</div>
          {activeDirs.map((d, i) => (
            <div
              key={i}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => (isFauxMode ? openFauxDir(d) : openDir(d))}
              onDragOver={(event) => {
                if (!isFauxMode) return;
                event.preventDefault();
              }}
              onDrop={() => handleFauxDrop(d.id)}
            >
              {d.name}
            </div>
          ))}
          <div className="p-2 font-bold">Files</div>
          {activeFiles.map((f, i) => (
            <div
              key={i}
              className="px-2 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => (isFauxMode ? openFauxFile(f) : openFile(f))}
              draggable={isFauxMode}
              onDragStart={() => {
                if (!isFauxMode) return;
                setDragState({ id: f.id, sourcePath: fauxPathIds });
              }}
              onDragEnd={() => {
                if (isFauxMode) setDragState(null);
              }}
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
                  {previewData.type === 'pdf' && (
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span>PDF preview available</span>
                      <button
                        onClick={() => openExternal(previewData.url)}
                        className="px-2 py-1 bg-black bg-opacity-50 rounded"
                      >
                        Open PDF
                      </button>
                    </div>
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
                  {previewData.type === 'link' && (
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span>Open this file in a new tab.</span>
                      <button
                        onClick={() => openExternal(previewData.url)}
                        className="px-2 py-1 bg-black bg-opacity-50 rounded"
                      >
                        Open
                      </button>
                    </div>
                  )}
                </div>
              )}
              <textarea
                className="flex-1 p-2 bg-ub-cool-grey outline-none"
                value={content}
                onChange={onChange}
                aria-label="File content"
                readOnly={currentFile.virtual && currentFile.url}
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
            {searchStatus === 'searching' && (
              <button
                onClick={stopSearch}
                className="ml-2 px-2 py-1 bg-black bg-opacity-50 rounded"
              >
                Stop
              </button>
            )}
            {searchStatus !== 'idle' && (
              <span className="ml-3 text-xs text-slate-300">
                {searchStatus === 'cancelling' ? 'Stopping…' : 'Scanned'} {searchProgress.scanned}{' '}
                files{searchProgress.skipped ? `, skipped ${searchProgress.skipped}` : ''}
              </span>
            )}
            <div className="max-h-40 overflow-auto mt-2">
              {results.map((r, i) => (
                <div key={i}>
                  {r.kind === 'faux' ? (
                    <>
                      <span className="font-bold">{r.path}</span> {r.name}
                    </>
                  ) : (
                    <>
                      <span className="font-bold">{r.file}:{r.line}</span> {r.text}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
