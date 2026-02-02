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
  createEntry,
  deleteEntry,
  duplicateEntry,
  moveEntry,
  renameEntry,
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

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return 'Unknown size';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** idx;
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const formatTimestamp = (value) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
};

const splitFileName = (name) => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0) return { base: name, ext: '' };
  return { base: name.slice(0, dotIndex), ext: name.slice(dotIndex) };
};

const buildDuplicateName = (name, existing) => {
  const { base, ext } = splitFileName(name);
  let attempt = `${base} copy${ext}`;
  let index = 2;
  while (existing.has(attempt.toLowerCase())) {
    attempt = `${base} copy ${index}${ext}`;
    index += 1;
  }
  return attempt;
};

const buildUniqueName = (name, existing) => {
  if (!existing.has(name.toLowerCase())) return name;
  const { base, ext } = splitFileName(name);
  let index = 2;
  let attempt = `${base} ${index}${ext}`;
  while (existing.has(attempt.toLowerCase())) {
    index += 1;
    attempt = `${base} ${index}${ext}`;
  }
  return attempt;
};

export default function FileExplorer({ context, initialPath, path: pathProp } = {}) {
  const [supported, setSupported] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [fauxTree, setFauxTree] = useState(null);
  const [fauxPathIds, setFauxPathIds] = useState(['root']);
  const [fauxDirectories, setFauxDirectories] = useState([]);
  const [fauxFiles, setFauxFiles] = useState([]);
  const [fauxBreadcrumbs, setFauxBreadcrumbs] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [selectedEntries, setSelectedEntries] = useState(new Map());
  const [indexStatus, setIndexStatus] = useState({ state: 'idle', indexed: 0, total: 0 });
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
  const isFauxMode = !supported;

  const hasUnsavedChanges = useMemo(
    () => currentFile && content !== savedContent,
    [content, currentFile, savedContent],
  );

  const selectedList = useMemo(() => Array.from(selectedEntries.values()), [selectedEntries]);

  useEffect(() => {
    if (!currentFile) setFileMeta(null);
  }, [currentFile]);

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
    if (supported) return;
    const tree = loadFauxFileSystem();
    const requested =
      (context?.initialPath ?? context?.path ?? initialPath ?? pathProp) || '';
    const pathIds = requested
      ? findNodeByPathNames(tree, requested.split('/'))
      : ['root'];
    setFauxTree(tree);
    setFauxPathIds(pathIds);
    syncFauxDirectory(tree, pathIds);
  }, [supported, context, initialPath, pathProp, syncFauxDirectory]);

  useEffect(() => {
    setSelectedEntries(new Map());
  }, [dirHandle, fauxPathIds, supported]);

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

  const buildFileMeta = (name, file, override = {}) => {
    const lower = name?.toLowerCase() || '';
    const typeFromName = () => {
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'Markdown';
      if (lower.endsWith('.json')) return 'JSON';
      if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'Image';
      if (lower.match(/\.(mp3|wav|ogg|m4a)$/)) return 'Audio';
      if (lower.match(/\.(mp4|webm|ogv)$/)) return 'Video';
      if (lower.endsWith('.pdf')) return 'PDF';
      return 'File';
    };
    const size = override.size ?? file?.size ?? null;
    const modified = override.modifiedAt ?? file?.lastModified ?? null;
    const type = override.type ?? (file?.type || typeFromName());
    return {
      size,
      modified,
      type,
    };
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
        setLocationError('Permission denied for this recent location. Use Reconnect to re-authorize access.');
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

  const reconnectRecent = async (entry) => {
    const proceed = await ensureSaved();
    if (!proceed) return;
    const allowed = await ensureHandlePermission(entry.handle);
    if (!allowed) {
      setLocationError('Reconnect failed. Please allow access in your browser prompt.');
      return;
    }
    await openHandle(entry.handle, { breadcrumbName: entry.name, recordRecent: true });
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
    if (lower.match(/\.(mp3|wav|ogg|m4a)$/)) {
      if (directUrl) {
        return { type: 'audio', url: directUrl };
      }
      if (file) {
        return { type: 'audio', url: URL.createObjectURL(file) };
      }
    }
    if (lower.match(/\.(mp4|webm|ogv)$/)) {
      if (directUrl) {
        return { type: 'video', url: directUrl };
      }
      if (file) {
        return { type: 'video', url: URL.createObjectURL(file) };
      }
    }
    if (lower.endsWith('.pdf')) {
      if (directUrl) {
        return { type: 'pdf', url: directUrl };
      }
      if (file) {
        return { type: 'pdf', url: URL.createObjectURL(file) };
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
    setFileMeta(null);
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
      setFileMeta(buildFileMeta(file.name, fetched));
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
    setFileMeta(null);
    setContent('');
    setSavedContent('');
    const text = file?.content ?? '';
    setContent(text);
    setSavedContent(text);
    setPreviewData(buildPreview(file.name, null, text, { url: file.url }));
    setFileMeta(
      buildFileMeta(file.name, null, {
        size: typeof file?.size === 'number' ? file.size : text ? new Blob([text]).size : null,
        modifiedAt: file?.modifiedAt,
        type: file?.type,
      }),
    );
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
      setFileMeta(
        buildFileMeta(currentFile.name, null, {
          size: new Blob([content]).size,
          modifiedAt: Date.now(),
          type: fileMeta?.type,
        }),
      );
      return;
    }
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile.name);
      setSavedContent(content);
      setFileMeta(
        buildFileMeta(currentFile.name, null, {
          size: new Blob([content]).size,
          modifiedAt: Date.now(),
          type: fileMeta?.type,
        }),
      );
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
    if (!dirHandle || !hasWorker || !workerRef.current) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setResults([]);
    workerRef.current.postMessage({ type: 'search', query: trimmed });
  };

  useEffect(() => {
    if (!hasWorker || isFauxMode) return;
    if (!workerRef.current && typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./find.worker.js', import.meta.url));
    }
    const worker = workerRef.current;
    if (!worker) return;
    const handleMessage = (event) => {
      const { type, file, line, text, indexed, total } = event.data || {};
      if (type === 'index-progress') {
        setIndexStatus({ state: 'indexing', indexed: indexed ?? 0, total: 0 });
        return;
      }
      if (type === 'index-complete') {
        setIndexStatus({ state: 'ready', indexed: total ?? 0, total: total ?? 0 });
        return;
      }
      if (type === 'search-result') {
        setResults((r) => [...r, { file, line, text }]);
        return;
      }
      if (type === 'search-complete') {
        return;
      }
    };
    worker.addEventListener('message', handleMessage);
    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [hasWorker, isFauxMode]);

  useEffect(() => {
    if (!hasWorker || isFauxMode || !dirHandle || !workerRef.current) return;
    setIndexStatus({ state: 'indexing', indexed: 0, total: 0 });
    workerRef.current.postMessage({ type: 'index', directoryHandle: dirHandle });
  }, [dirHandle, hasWorker, isFauxMode]);

  useEffect(() => {
    if (isFauxMode) {
      setIndexStatus({ state: 'idle', indexed: 0, total: 0 });
    }
  }, [isFauxMode]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => () => {
    const url = previewData?.url;
    if (!url) return;
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, [previewData]);

  const activeDirs = isFauxMode ? fauxDirectories : dirs;
  const activeFiles = isFauxMode ? fauxFiles : files;
  const activeBreadcrumbs = isFauxMode ? fauxBreadcrumbs : path;
  const existingNames = useMemo(() => {
    const names = new Set();
    activeDirs?.forEach((dir) => names.add(dir.name.toLowerCase()));
    activeFiles?.forEach((file) => names.add(file.name.toLowerCase()));
    return names;
  }, [activeDirs, activeFiles]);

  const toggleSelection = (entry) => {
    setSelectedEntries((prev) => {
      const next = new Map(prev);
      if (next.has(entry.key)) {
        next.delete(entry.key);
      } else {
        next.set(entry.key, entry);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedEntries(new Map());

  const ensureWritable = async () => {
    if (isFauxMode) return !!fauxTree;
    if (!dirHandle) {
      setLocationError('Open a folder to manage files.');
      return false;
    }
    const allowed = await ensureHandlePermission(dirHandle, 'readwrite');
    if (!allowed) {
      setLocationError('Write permission denied for this folder. Use Reconnect to try again.');
      return false;
    }
    return true;
  };

  const refreshDirectory = async () => {
    if (isFauxMode) {
      if (!fauxTree) return;
      syncFauxDirectory(fauxTree, fauxPathIds);
      return;
    }
    if (dirHandle) {
      await openHandle(dirHandle, { breadcrumbs: path });
    }
  };

  const buildSelectionEntry = (entry, type) => {
    if (isFauxMode) {
      return {
        key: `${type}:${entry.id}`,
        id: entry.id,
        name: entry.name,
        type,
      };
    }
    return {
      key: `${type}:${entry.name}`,
      name: entry.name,
      type,
      handle: entry.handle,
    };
  };

  const copyFileHandle = async (sourceHandle, targetDir, name) => {
    const file = await sourceHandle.getFile();
    const destHandle = await targetDir.getFileHandle(name, { create: true });
    const writable = await destHandle.createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();
  };

  const copyDirectoryHandle = async (sourceHandle, targetDir) => {
    for await (const [name, handle] of sourceHandle.entries()) {
      if (handle.kind === 'file') {
        await copyFileHandle(handle, targetDir, name);
      } else if (handle.kind === 'directory') {
        const nextDir = await targetDir.getDirectoryHandle(name, { create: true });
        await copyDirectoryHandle(handle, nextDir);
      }
    }
  };

  const handleCreateFolder = async () => {
    const allowed = await ensureWritable();
    if (!allowed) return;
    const name = window.prompt('New folder name');
    if (!name) return;
    if (existingNames.has(name.toLowerCase())) {
      setLocationError('A file or folder with that name already exists.');
      return;
    }
    if (isFauxMode) {
      if (!fauxTree) return;
      const nextTree = createEntry(fauxTree, fauxPathIds, { type: 'folder', name });
      setFauxTree(nextTree);
      saveFauxFileSystem(nextTree);
      syncFauxDirectory(nextTree, fauxPathIds);
      return;
    }
    await dirHandle.getDirectoryHandle(name, { create: true });
    await refreshDirectory();
  };

  const handleCreateFile = async () => {
    const allowed = await ensureWritable();
    if (!allowed) return;
    const name = window.prompt('New file name');
    if (!name) return;
    if (existingNames.has(name.toLowerCase())) {
      setLocationError('A file or folder with that name already exists.');
      return;
    }
    if (isFauxMode) {
      if (!fauxTree) return;
      const nextTree = createEntry(fauxTree, fauxPathIds, { type: 'file', name, content: '' });
      setFauxTree(nextTree);
      saveFauxFileSystem(nextTree);
      syncFauxDirectory(nextTree, fauxPathIds);
      return;
    }
    const handle = await dirHandle.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write('');
    await writable.close();
    await refreshDirectory();
  };

  const handleRenameEntry = async () => {
    const allowed = await ensureWritable();
    if (!allowed || selectedList.length !== 1) return;
    const entry = selectedList[0];
    const nextName = window.prompt('Rename to', entry.name);
    if (!nextName || nextName === entry.name) return;
    if (existingNames.has(nextName.toLowerCase())) {
      setLocationError('A file or folder with that name already exists.');
      return;
    }
    if (isFauxMode) {
      if (!fauxTree) return;
      const nextTree = renameEntry(fauxTree, fauxPathIds, entry.id, nextName);
      setFauxTree(nextTree);
      saveFauxFileSystem(nextTree);
      syncFauxDirectory(nextTree, fauxPathIds);
      clearSelection();
      return;
    }
    if (entry.type === 'directory') {
      const targetDir = await dirHandle.getDirectoryHandle(nextName, { create: true });
      await copyDirectoryHandle(entry.handle, targetDir);
      await dirHandle.removeEntry(entry.name, { recursive: true });
    } else {
      await copyFileHandle(entry.handle, dirHandle, nextName);
      await dirHandle.removeEntry(entry.name);
    }
    await refreshDirectory();
    clearSelection();
  };

  const handleDuplicateEntry = async () => {
    const allowed = await ensureWritable();
    if (!allowed || selectedList.length === 0) return;
    const usedNames = new Set(existingNames);
    if (isFauxMode) {
      if (!fauxTree) return;
      let nextTree = fauxTree;
      selectedList.forEach((entry) => {
        const name = buildDuplicateName(entry.name, usedNames);
        nextTree = duplicateEntry(nextTree, fauxPathIds, entry.id, name);
        usedNames.add(name.toLowerCase());
      });
      setFauxTree(nextTree);
      saveFauxFileSystem(nextTree);
      syncFauxDirectory(nextTree, fauxPathIds);
      clearSelection();
      return;
    }
    for (const entry of selectedList) {
      const name = buildDuplicateName(entry.name, usedNames);
      if (entry.type === 'directory') {
        const targetDir = await dirHandle.getDirectoryHandle(name, { create: true });
        await copyDirectoryHandle(entry.handle, targetDir);
      } else {
        await copyFileHandle(entry.handle, dirHandle, name);
      }
      usedNames.add(name.toLowerCase());
    }
    await refreshDirectory();
    clearSelection();
  };

  const handleDeleteEntry = async () => {
    const allowed = await ensureWritable();
    if (!allowed || selectedList.length === 0) return;
    const confirmDelete = window.confirm(`Delete ${selectedList.length} item(s)?`);
    if (!confirmDelete) return;
    if (isFauxMode) {
      if (!fauxTree) return;
      let nextTree = fauxTree;
      selectedList.forEach((entry) => {
        nextTree = deleteEntry(nextTree, fauxPathIds, entry.id);
      });
      setFauxTree(nextTree);
      saveFauxFileSystem(nextTree);
      syncFauxDirectory(nextTree, fauxPathIds);
      clearSelection();
      return;
    }
    for (const entry of selectedList) {
      await dirHandle.removeEntry(entry.name, { recursive: entry.type === 'directory' });
    }
    await refreshDirectory();
    clearSelection();
  };

  const handleMoveEntry = async () => {
    const allowed = await ensureWritable();
    if (!allowed || selectedList.length === 0) return;
    if (isFauxMode) {
      if (!fauxTree) return;
      const targetPath = window.prompt('Move to folder path (e.g. Documents/Design)');
      if (!targetPath) return;
      const segments = targetPath.split('/').map((segment) => segment.trim()).filter(Boolean);
      const targetIds = findNodeByPathNames(fauxTree, segments);
      const resolvedNodes = findNodeByPathIds(fauxTree, targetIds);
      if (!targetIds.length || resolvedNodes.length !== segments.length + 1) {
        setLocationError('Target folder not found.');
        return;
      }
      let nextTree = fauxTree;
      selectedList.forEach((entry) => {
        nextTree = moveEntry(nextTree, fauxPathIds, entry.id, targetIds);
      });
      setFauxTree(nextTree);
      saveFauxFileSystem(nextTree);
      syncFauxDirectory(nextTree, fauxPathIds);
      clearSelection();
      return;
    }
    if (typeof window === 'undefined' || !window.showDirectoryPicker) {
      setLocationError('Move requires the browser directory picker.');
      return;
    }
    const targetHandle = await window.showDirectoryPicker();
    const allowedTarget = await ensureHandlePermission(targetHandle);
    if (!allowedTarget) {
      setLocationError('Permission denied for the destination folder.');
      return;
    }
    const targetNames = new Set();
    for await (const [name] of targetHandle.entries()) {
      targetNames.add(name.toLowerCase());
    }
    for (const entry of selectedList) {
      const targetName = buildUniqueName(entry.name, targetNames);
      if (entry.type === 'directory') {
        const newDir = await targetHandle.getDirectoryHandle(targetName, { create: true });
        await copyDirectoryHandle(entry.handle, newDir);
      } else {
        await copyFileHandle(entry.handle, targetHandle, targetName);
      }
      targetNames.add(targetName.toLowerCase());
      await dirHandle.removeEntry(entry.name, { recursive: entry.type === 'directory' });
    }
    await refreshDirectory();
    clearSelection();
  };

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

  const selectedCount = selectedList.length;
  const canModify = isFauxMode ? !!fauxTree : !!dirHandle;
  const canRename = selectedCount === 1;
  const canBulkAction = selectedCount > 0;

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white text-sm">
      <div className="flex items-center space-x-2 p-2 bg-ub-warm-grey bg-opacity-40">
        <button
          onClick={supported ? openFolder : () => {
            if (!fauxTree) return;
            setFauxPathIds(['root']);
            syncFauxDirectory(fauxTree, ['root']);
          }}
          className="px-2 py-1 bg-black bg-opacity-50 rounded"
        >
          {supported ? 'Open Folder' : 'Go Home'}
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
      <div className={`px-2 py-1 text-xs ${isFauxMode ? 'bg-amber-900/40 text-amber-100' : 'bg-emerald-900/30 text-emerald-100'}`}>
        {isFauxMode
          ? 'Demo mode: using a simulated file system. Changes stay in this browser session and recents are disabled.'
          : 'Real file system mode: managing files from the selected folder.'}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-2 py-1 border-b border-gray-700 bg-black bg-opacity-20">
        <span className="text-xs uppercase tracking-wide text-slate-300">Actions</span>
        <button
          onClick={handleCreateFile}
          disabled={!canModify}
          className={`px-2 py-1 rounded ${canModify ? 'bg-black bg-opacity-50 hover:bg-opacity-70' : 'bg-black bg-opacity-30 cursor-not-allowed'}`}
        >
          New File
        </button>
        <button
          onClick={handleCreateFolder}
          disabled={!canModify}
          className={`px-2 py-1 rounded ${canModify ? 'bg-black bg-opacity-50 hover:bg-opacity-70' : 'bg-black bg-opacity-30 cursor-not-allowed'}`}
        >
          New Folder
        </button>
        <button
          onClick={handleRenameEntry}
          disabled={!canModify || !canRename}
          className={`px-2 py-1 rounded ${canModify && canRename ? 'bg-black bg-opacity-50 hover:bg-opacity-70' : 'bg-black bg-opacity-30 cursor-not-allowed'}`}
        >
          Rename
        </button>
        <button
          onClick={handleDuplicateEntry}
          disabled={!canModify || !canBulkAction}
          className={`px-2 py-1 rounded ${canModify && canBulkAction ? 'bg-black bg-opacity-50 hover:bg-opacity-70' : 'bg-black bg-opacity-30 cursor-not-allowed'}`}
        >
          Duplicate
        </button>
        <button
          onClick={handleMoveEntry}
          disabled={!canModify || !canBulkAction}
          className={`px-2 py-1 rounded ${canModify && canBulkAction ? 'bg-black bg-opacity-50 hover:bg-opacity-70' : 'bg-black bg-opacity-30 cursor-not-allowed'}`}
        >
          Move
        </button>
        <button
          onClick={handleDeleteEntry}
          disabled={!canModify || !canBulkAction}
          className={`px-2 py-1 rounded ${canModify && canBulkAction ? 'bg-red-700 hover:bg-red-600' : 'bg-black bg-opacity-30 cursor-not-allowed'}`}
        >
          Delete
        </button>
        <span className="ml-auto text-xs text-slate-300">
          {selectedCount ? `${selectedCount} selected` : 'No selection'}
        </span>
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
            : recent.map((r, i) => (
                <div key={i} className="px-2 py-1 hover:bg-black hover:bg-opacity-30">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => openRecent(r)}
                      disabled={r.permission === 'denied'}
                    >
                      {r.name}
                    </button>
                    {r.permission && r.permission !== 'granted' && (
                      <button
                        type="button"
                        onClick={() => reconnectRecent(r)}
                        className="px-2 py-0.5 text-xs bg-black bg-opacity-50 rounded"
                      >
                        Reconnect
                      </button>
                    )}
                  </div>
                  {r.permission && r.permission !== 'granted' && (
                    <div className="text-[10px] text-amber-200">
                      Access needs permission.
                    </div>
                  )}
                </div>
              ))}
          <div className="p-2 font-bold">Directories</div>
          {activeDirs.map((d, i) => {
            const entry = buildSelectionEntry(d, 'directory');
            const isSelected = selectedEntries.has(entry.key);
            return (
              <div
                key={i}
                className={`px-2 flex items-center gap-2 hover:bg-black hover:bg-opacity-30 ${
                  isSelected ? 'bg-black bg-opacity-40' : ''
                }`}
                onDragOver={(event) => {
                  if (!isFauxMode) return;
                  event.preventDefault();
                }}
                onDrop={() => handleFauxDrop(d.id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(entry)}
                  aria-label={`Select ${d.name}`}
                />
                <button
                  type="button"
                  onClick={() => (isFauxMode ? openFauxDir(d) : openDir(d))}
                  className="flex-1 text-left"
                >
                  {d.name}
                </button>
              </div>
            );
          })}
          <div className="p-2 font-bold">Files</div>
          {activeFiles.map((f, i) => {
            const entry = buildSelectionEntry(f, 'file');
            const isSelected = selectedEntries.has(entry.key);
            return (
              <div
                key={i}
                className={`px-2 flex items-center gap-2 hover:bg-black hover:bg-opacity-30 ${
                  isSelected ? 'bg-black bg-opacity-40' : ''
                }`}
                draggable={isFauxMode}
                onDragStart={() => {
                  if (!isFauxMode) return;
                  setDragState({ id: f.id, sourcePath: fauxPathIds });
                }}
                onDragEnd={() => {
                  if (isFauxMode) setDragState(null);
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(entry)}
                  aria-label={`Select ${f.name}`}
                />
                <button
                  type="button"
                  onClick={() => (isFauxMode ? openFauxFile(f) : openFile(f))}
                  className="flex-1 text-left"
                >
                  {f.name}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex-1 flex flex-col">
          {currentFile && (
            <div className="flex flex-col flex-1 overflow-auto">
              <div className="px-2 py-1 border-b border-gray-600 bg-black bg-opacity-20">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{currentFile.name}</div>
                  {loading && <div className="text-xs text-gray-300">Loading...</div>}
                </div>
                {fileMeta && (
                  <div className="flex flex-wrap gap-3 text-xs text-slate-300 mt-1">
                    <span>Type: {fileMeta.type || 'Unknown'}</span>
                    <span>Size: {formatBytes(fileMeta.size)}</span>
                    <span>Modified: {formatTimestamp(fileMeta.modified)}</span>
                  </div>
                )}
              </div>
              {previewData && (
                <div className="p-2 border-b border-gray-700 overflow-auto max-h-64 bg-black bg-opacity-20">
                  {previewData.type === 'image' && (
                    <img src={previewData.url} alt={`${currentFile.name} preview`} className="max-h-60 mx-auto" />
                  )}
                  {previewData.type === 'audio' && (
                    <audio controls src={previewData.url} className="w-full" />
                  )}
                  {previewData.type === 'video' && (
                    <video controls src={previewData.url} className="max-h-60 w-full" />
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
                      className="prose prose-invert max-w-none prose-pre:bg-black/40 prose-pre:text-slate-100 prose-code:text-slate-200"
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
            <div className="text-xs text-slate-300 mt-1">
              {isFauxMode
                ? 'Searching the demo file list.'
                : indexStatus.state === 'indexing'
                  ? `Indexing ${indexStatus.indexed} files...`
                  : indexStatus.state === 'ready'
                    ? `Indexed ${indexStatus.total} files.`
                    : 'Index idle.'}
            </div>
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
