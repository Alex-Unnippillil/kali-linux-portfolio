'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useOPFS from '../../hooks/useOPFS';
import usePersistentState from '../../hooks/usePersistentState';
import { getDb } from '../../utils/safeIDB';
import Breadcrumbs from '../ui/Breadcrumbs';
import SmartFolderEditor from './files/SmartFolderEditor';
import {
  SMART_FOLDER_TEMPLATES,
  SmartFolder,
  SmartFolderFilter,
  SmartFolderSort,
  SmartFolderTemplate,
} from '../../data/files/smart-folder-templates';

type RecentEntry = { name: string; handle: FileSystemDirectoryHandle };

interface PathEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
  segments: string[];
}

interface DirectoryEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
  segments: string[];
}

interface FileListing {
  name: string;
  handle: FileSystemFileHandle;
  pathSegments: string[];
  pathKey: string;
}

interface SmartFolderResult extends FileListing {
  size: number;
  lastModified: number;
  type: string;
}

interface SearchResult {
  file: string;
  line: number;
  text: string;
}

type Metadata = Pick<SmartFolderResult, 'size' | 'lastModified' | 'type'>;

type FileDialogOptions = Record<string, unknown>;

const DB_NAME = 'file-explorer';
const STORE_NAME = 'recent';
const MAX_RESULTS = 500;
const BATCH_SIZE = 35;
const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleString();

const createSmartFolderId = (templateId: string): string => {
  const base = templateId.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return `${base}-${(crypto as any).randomUUID().slice(0, 8)}`;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
};

const cloneFilters = (filters: SmartFolderFilter[]): SmartFolderFilter[] =>
  filters.map((filter) => ({ ...filter }));

const cloneSort = (sort?: SmartFolderSort) => (sort ? { ...sort } : undefined);

const isSmartFolderArray = (value: unknown): value is SmartFolder[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as SmartFolder).id === 'string' &&
      typeof (item as SmartFolder).name === 'string' &&
      Array.isArray((item as SmartFolder).filters),
  );

function openDB() {
  return getDb(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    },
  });
}

async function getRecentDirs(): Promise<RecentEntry[]> {
  try {
    const dbPromise = openDB();
    if (!dbPromise) return [];
    const db: any = await dbPromise;
    return (await db.getAll(STORE_NAME)) || [];
  } catch {
    return [];
  }
}

async function addRecentDir(handle: FileSystemDirectoryHandle) {
  try {
    const dbPromise = openDB();
    if (!dbPromise) return;
    const db: any = await dbPromise;
    await db.put(STORE_NAME, { name: handle.name, handle });
  } catch {
    // ignore failures
  }
}

export async function openFileDialog(options: FileDialogOptions = {}) {
  if (typeof window !== 'undefined' && (window as any).showOpenFilePicker) {
    const [handle] = await (window as any).showOpenFilePicker(options);
    return handle as FileSystemFileHandle;
  }

  return new Promise<FileSystemFileHandle | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options.multiple) input.multiple = true;
    if (Array.isArray(options.types)) {
      const accept = options.types as Array<{ accept?: Record<string, string[]> }>;
      const flat = accept
        .map((item) => (item.accept ? Object.values(item.accept).flat() : []))
        .flat()
        .join(',');
      if (flat) input.accept = flat;
    }
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        name: file.name,
        getFile: async () => file,
      } as unknown as FileSystemFileHandle);
    };
    input.click();
  });
}

export async function saveFileDialog(options: FileDialogOptions = {}) {
  if (typeof window !== 'undefined' && (window as any).showSaveFilePicker) {
    return (window as any).showSaveFilePicker(options);
  }

  return {
    name: (options as any)?.suggestedName || 'download',
    async createWritable() {
      return {
        async write(data: Blob | string | ArrayBuffer) {
          const blob = data instanceof Blob ? data : new Blob([data]);
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = (options as any)?.suggestedName || 'download';
          anchor.click();
          URL.revokeObjectURL(url);
        },
        async close() {
          // no-op fallback
        },
      };
    },
  };
}
interface SmartFolderGalleryProps {
  templates: SmartFolderTemplate[];
  onAdd: (template: SmartFolderTemplate) => void;
}

const SmartFolderGallery: React.FC<SmartFolderGalleryProps> = ({ templates, onAdd }) => {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => (
          <article
            key={template.id}
            className="rounded border border-gray-700 bg-black bg-opacity-40 p-4 shadow-inner"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: template.accentColor || '#f97316' }}
                  aria-hidden
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {template.icon && (
                      <img
                        src={template.icon}
                        alt=""
                        className="h-5 w-5 flex-shrink-0"
                      />
                    )}
                    <h3 className="font-semibold text-white">{template.name}</h3>
                  </div>
                  <p className="text-sm text-gray-300">{template.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAdd(template)}
                className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black shadow"
              >
                Add to sidebar
              </button>
            </div>
            {template.tips && template.tips.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-gray-400">
                {template.tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span aria-hidden>•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};

const evaluateBaseFilters = (
  record: SmartFolderResult,
  filters: SmartFolderFilter[],
): boolean => {
  return filters.every((filter) => {
    if (filter.kind === 'duplicate') return true;
    if (filter.kind === 'date') {
      const boundary = new Date();
      boundary.setHours(0, 0, 0, 0);
      boundary.setDate(boundary.getDate() - filter.withinDays);
      return record.lastModified >= boundary.getTime();
    }
    if (filter.kind === 'size') {
      return filter.operator === 'gte'
        ? record.size >= filter.bytes
        : record.size <= filter.bytes;
    }
    if (filter.kind === 'path') {
      const haystack = filter.caseSensitive
        ? record.pathKey
        : record.pathKey.toLowerCase();
      const needle = filter.caseSensitive
        ? filter.value
        : filter.value.toLowerCase();
      return filter.operator === 'startsWith'
        ? haystack.startsWith(needle)
        : haystack.includes(needle);
    }
    return true;
  });
};

const applyDuplicateFilters = (
  records: SmartFolderResult[],
  filters: SmartFolderFilter[],
): SmartFolderResult[] => {
  let current = records;
  filters.forEach((filter) => {
    if (filter.kind !== 'duplicate') return;
    const groups = new Map<string, SmartFolderResult[]>();
    current.forEach((record) => {
      let key: string | null = null;
      if (filter.basis === 'name') key = record.name.toLowerCase();
      else if (filter.basis === 'size') key = `${record.size}`;
      else key = `${record.name.toLowerCase()}::${record.size}`;
      if (!key) return;
      const bucket = groups.get(key);
      if (bucket) bucket.push(record);
      else groups.set(key, [record]);
    });
    const duplicates: SmartFolderResult[] = [];
    groups.forEach((bucket) => {
      if (bucket.length > 1) duplicates.push(...bucket);
    });
    current = duplicates;
  });
  return current;
};

const sortRecords = (
  records: SmartFolderResult[],
  sort?: SmartFolderSort,
): SmartFolderResult[] => {
  if (!sort) return records;
  const sorted = [...records];
  sorted.sort((a, b) => {
    let diff = 0;
    if (sort.field === 'lastModified') diff = a.lastModified - b.lastModified;
    else if (sort.field === 'size') diff = a.size - b.size;
    else diff = a.name.localeCompare(b.name);
    return sort.direction === 'asc' ? diff : -diff;
  });
  return sorted;
};
const collectSmartFolderResults = async (
  folder: SmartFolder,
  root: FileSystemDirectoryHandle,
  getMetadata: (
    pathKey: string,
    handle: FileSystemFileHandle,
    signal: AbortSignal,
  ) => Promise<Metadata | null>,
  signal: AbortSignal,
): Promise<SmartFolderResult[]> => {
  const baseFilters = folder.filters.filter((filter) => filter.kind !== 'duplicate');
  const duplicateFilters = folder.filters.filter((filter) => filter.kind === 'duplicate');
  const matches: SmartFolderResult[] = [];
  const stack: Array<{ dir: FileSystemDirectoryHandle; segments: string[] }> = [
    { dir: root, segments: [] },
  ];
  let scanned = 0;

  while (stack.length > 0) {
    const { dir, segments } = stack.pop()!;
    for await (const [name, entry] of (dir as any).entries()) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (entry.kind === 'directory') {
        stack.push({
          dir: entry as FileSystemDirectoryHandle,
          segments: [...segments, name],
        });
        continue;
      }
      const fileHandle = entry as FileSystemFileHandle;
      const pathSegments = [...segments, name];
      const pathKey = pathSegments.join('/');
      const metadata = await getMetadata(pathKey, fileHandle, signal);
      if (!metadata) continue;
      const record: SmartFolderResult = {
        name,
        handle: fileHandle,
        pathSegments,
        pathKey,
        ...metadata,
      };
      if (evaluateBaseFilters(record, baseFilters)) {
        matches.push(record);
      }
      scanned += 1;
      if (scanned % BATCH_SIZE === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  const filtered = duplicateFilters.length
    ? applyDuplicateFilters(matches, duplicateFilters)
    : matches;

  const sorted = sortRecords(filtered, folder.sort);

  return sorted.slice(0, MAX_RESULTS);
};
const FileExplorer: React.FC = () => {
  const [supported, setSupported] = useState(true);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [path, setPath] = useState<PathEntry[]>([]);
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [files, setFiles] = useState<FileListing[]>([]);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [currentFile, setCurrentFile] = useState<FileListing | null>(null);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);
  const metadataCacheRef = useRef<Map<string, Metadata>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const [smartFolders, setSmartFolders] = usePersistentState<SmartFolder[]>(
    'files:smart-folders',
    () => [],
    isSmartFolderArray,
  );
  const [showGallery, setShowGallery] = useState(false);
  const [selectedSmartFolderId, setSelectedSmartFolderId] = useState<string | null>(null);
  const [smartFolderResults, setSmartFolderResults] = useState<SmartFolderResult[]>([]);
  const [smartFolderLoading, setSmartFolderLoading] = useState(false);
  const [smartFolderError, setSmartFolderError] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<SmartFolder | null>(null);
  const [unsavedDir, setUnsavedDir] = useState<FileSystemDirectoryHandle | null>(null);

  const {
    supported: opfsSupported,
    root,
    getDir,
    readFile: opfsRead,
    writeFile: opfsWrite,
    deleteFile: opfsDelete,
  } = useOPFS();
  const getMetadata = useCallback(
    async (
      pathKey: string,
      handle: FileSystemFileHandle,
      signal: AbortSignal,
    ): Promise<Metadata | null> => {
      if (signal.aborted) return null;
      const cached = metadataCacheRef.current.get(pathKey);
      if (cached) return cached;
      try {
        const file = await handle.getFile();
        if (signal.aborted) return null;
        const metadata = {
          size: file.size,
          lastModified: file.lastModified,
          type: file.type,
        } satisfies Metadata;
        metadataCacheRef.current.set(pathKey, metadata);
        return metadata;
      } catch {
        return null;
      }
    },
    [],
  );

  const saveBuffer = useCallback(
    async (name: string, data: string) => {
      if (unsavedDir) await opfsWrite(name, data, unsavedDir);
    },
    [opfsWrite, unsavedDir],
  );

  const loadBuffer = useCallback(
    async (name: string) => {
      if (!unsavedDir) return null;
      return opfsRead(name, unsavedDir);
    },
    [opfsRead, unsavedDir],
  );

  const removeBuffer = useCallback(
    async (name: string) => {
      if (unsavedDir) await opfsDelete(name, unsavedDir);
    },
    [opfsDelete, unsavedDir],
  );
  const readDir = useCallback(
    async (handle: FileSystemDirectoryHandle, segments: string[]) => {
      const newDirs: DirectoryEntry[] = [];
      const newFiles: FileListing[] = [];
      try {
        for await (const [name, entry] of (handle as any).entries()) {
          const pathSegments = [...segments, name];
          if (entry.kind === 'directory') {
            newDirs.push({
              name,
              handle: entry as FileSystemDirectoryHandle,
              segments: pathSegments,
            });
          } else if (entry.kind === 'file') {
            newFiles.push({
              name,
              handle: entry as FileSystemFileHandle,
              pathSegments,
              pathKey: pathSegments.join('/'),
            });
          }
        }
      } catch (error) {
        console.error('Failed to read directory', error);
      }
      setDirectories(newDirs.sort((a, b) => a.name.localeCompare(b.name)));
      setFiles(newFiles.sort((a, b) => a.name.localeCompare(b.name)));
    },
    [],
  );
  const openFolder = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) return;
    try {
      const handle = await (window as any).showDirectoryPicker();
      setDirHandle(handle);
      const entry: PathEntry = {
        name: handle.name || '/',
        handle,
        segments: [],
      };
      setPath([entry]);
      await addRecentDir(handle);
      setRecent(await getRecentDirs());
      await readDir(handle, []);
    } catch (error) {
      console.warn('Unable to open folder', error);
    }
  }, [readDir]);

  const openRecent = useCallback(
    async (entry: RecentEntry) => {
      try {
        const permission = await entry.handle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') return;
        setDirHandle(entry.handle);
        const segments: string[] = [];
        const rootEntry: PathEntry = { name: entry.name, handle: entry.handle, segments };
        setPath([rootEntry]);
        await readDir(entry.handle, segments);
      } catch (error) {
        console.warn('Unable to open recent directory', error);
      }
    },
    [readDir],
  );

  const openDir = useCallback(
    async (dir: DirectoryEntry) => {
      setDirHandle(dir.handle);
      setPath((prev) => [...prev, dir]);
      await readDir(dir.handle, dir.segments);
    },
    [readDir],
  );

  const navigateTo = useCallback(
    async (index: number) => {
      const target = path[index];
      if (!target) return;
      setDirHandle(target.handle);
      setPath(path.slice(0, index + 1));
      await readDir(target.handle, target.segments);
    },
    [path, readDir],
  );

  const goBack = useCallback(async () => {
    if (path.length <= 1) return;
    const nextPath = path.slice(0, -1);
    const prev = nextPath[nextPath.length - 1];
    setPath(nextPath);
    setDirHandle(prev.handle);
    await readDir(prev.handle, prev.segments);
  }, [path, readDir]);
  const openFile = useCallback(
    async (file: FileListing) => {
      setCurrentFile(file);
      let text = '';
      if (opfsSupported) {
        const unsaved = await loadBuffer(file.pathKey);
        if (unsaved !== null) text = unsaved;
      }
      if (!text) {
        try {
          const snapshot = await file.handle.getFile();
          text = await snapshot.text();
        } catch (error) {
          console.warn('Unable to read file', error);
        }
      }
      setContent(text);
    },
    [loadBuffer, opfsSupported],
  );

  const saveFile = useCallback(async () => {
    if (!currentFile) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile.pathKey);
    } catch (error) {
      console.warn('Unable to save file', error);
    }
  }, [content, currentFile, opfsSupported, removeBuffer]);

  const handleContentChange = useCallback(
    async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = event.target.value;
      setContent(text);
      if (opfsSupported && currentFile) {
        await saveBuffer(currentFile.pathKey, text);
      }
    },
    [currentFile, opfsSupported, saveBuffer],
  );
  const runSearch = useCallback(() => {
    if (!dirHandle) return;
    setResults([]);
    if (workerRef.current) workerRef.current.terminate();
    if (typeof window === 'undefined' || typeof Worker !== 'function') return;
    const worker = new Worker(new URL('./find.worker.js', import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent) => {
      const { file, line, text, done } = event.data as {
        file?: string;
        line?: number;
        text?: string;
        done?: boolean;
      };
      if (done) {
        workerRef.current?.terminate();
        workerRef.current = null;
      } else if (file && typeof line === 'number' && text) {
        setResults((prev) => [...prev, { file, line, text }]);
      }
    };
    worker.postMessage({ directoryHandle: dirHandle, query });
  }, [dirHandle, query]);
  const runSmartFolderQuery = useCallback(
    async (folder: SmartFolder) => {
      if (!dirHandle) return;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setSmartFolderLoading(true);
      setSmartFolderError(null);
      setSmartFolderResults([]);
      try {
        const results = await collectSmartFolderResults(
          folder,
          dirHandle,
          getMetadata,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setSmartFolderResults(results);
        }
      } catch (error) {
        if ((error as DOMException).name !== 'AbortError') {
          console.error('Failed to evaluate smart folder', error);
          setSmartFolderError('Unable to evaluate smart folder. Adjust filters and try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setSmartFolderLoading(false);
        }
      }
    },
    [dirHandle, getMetadata],
  );
  const handleAddTemplate = useCallback(
    (template: SmartFolderTemplate) => {
      const now = new Date().toISOString();
      const newFolder: SmartFolder = {
        id: createSmartFolderId(template.id),
        templateId: template.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        accentColor: template.accentColor,
        filters: cloneFilters(template.filters),
        sort: cloneSort(template.sort),
        tips: template.tips ? [...template.tips] : undefined,
        createdAt: now,
        updatedAt: now,
      };
      setSmartFolders((current) => [...current, newFolder]);
      setShowGallery(false);
      setSelectedSmartFolderId(newFolder.id);
      if (dirHandle) {
        void runSmartFolderQuery(newFolder);
      }
    },
    [dirHandle, runSmartFolderQuery, setSmartFolders],
  );

  const selectedSmartFolder = useMemo(
    () => smartFolders.find((folder) => folder.id === selectedSmartFolderId) || null,
    [selectedSmartFolderId, smartFolders],
  );

  const showSmartFolderResults = !showGallery && !!selectedSmartFolder;

  const handleSaveFolder = useCallback(
    (updated: SmartFolder) => {
      setSmartFolders((current) =>
        current.map((folder) =>
          folder.id === updated.id
            ? { ...folder, ...updated, createdAt: folder.createdAt }
            : folder,
        ),
      );
      setEditingFolder(null);
      if (selectedSmartFolderId === updated.id && dirHandle) {
        void runSmartFolderQuery(updated);
      }
    },
    [dirHandle, runSmartFolderQuery, selectedSmartFolderId, setSmartFolders],
  );

  const handleDeleteFolder = useCallback(() => {
    if (!editingFolder) return;
    setSmartFolders((current) =>
      current.filter((folder) => folder.id !== editingFolder.id),
    );
    if (selectedSmartFolderId === editingFolder.id) {
      setSelectedSmartFolderId(null);
      setSmartFolderResults([]);
    }
    setEditingFolder(null);
  }, [editingFolder, selectedSmartFolderId, setSmartFolders]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasPicker = typeof (window as any).showDirectoryPicker === 'function';
    setSupported(hasPicker);
    if (hasPicker) {
      getRecentDirs().then(setRecent);
    }
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    let cancelled = false;
    (async () => {
      const unsaved = await getDir('unsaved');
      if (cancelled) return;
      setUnsavedDir(unsaved);
      setDirHandle(root);
      const rootEntry: PathEntry = {
        name: root.name || '/',
        handle: root,
        segments: [],
      };
      setPath([rootEntry]);
      await readDir(root, []);
    })();
    return () => {
      cancelled = true;
    };
  }, [getDir, opfsSupported, readDir, root]);

  useEffect(() => {
    metadataCacheRef.current.clear();
    setSmartFolderResults([]);
    setSelectedSmartFolderId(null);
  }, [dirHandle]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      abortControllerRef.current?.abort();
    },
    [],
  );
  const openFallback = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const listing: FileListing = {
      name: file.name,
      handle: {
        kind: 'file',
        name: file.name,
        getFile: async () => file,
      } as unknown as FileSystemFileHandle,
      pathSegments: [file.name],
      pathKey: file.name,
    };
    setCurrentFile(listing);
    setContent(text);
  }, []);
  const hasSmartFolders = smartFolders.length > 0;
  if (!supported) {
    return (
      <div className="flex h-full flex-col bg-ub-cool-grey p-4 text-sm text-white">
        <input
          ref={fallbackInputRef}
          type="file"
          onChange={openFallback}
          className="hidden"
        />
        {!currentFile && (
          <button
            type="button"
            onClick={() => fallbackInputRef.current?.click()}
            className="self-start rounded bg-black bg-opacity-50 px-3 py-1"
          >
            Open file
          </button>
        )}
        {currentFile && (
          <>
            <textarea
              className="mt-3 flex-1 rounded border border-gray-700 bg-black bg-opacity-30 p-2 text-white focus:outline-none"
              value={content}
              onChange={handleContentChange}
            />
            <button
              type="button"
              onClick={async () => {
                const handle = await saveFileDialog({ suggestedName: currentFile.name });
                const writable = await (handle as any).createWritable();
                await writable.write(content);
                await writable.close();
              }}
              className="mt-3 self-start rounded bg-black bg-opacity-50 px-3 py-1"
            >
              Save as…
            </button>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-sm text-white">
      <header className="flex items-center gap-2 border-b border-gray-700 bg-ub-warm-grey bg-opacity-40 p-2">
        <button
          type="button"
          onClick={openFolder}
          className="rounded bg-black bg-opacity-50 px-3 py-1"
        >
          Open folder
        </button>
        {path.length > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="rounded bg-black bg-opacity-50 px-3 py-1"
          >
            Back
          </button>
        )}
        <Breadcrumbs path={path} onNavigate={(index) => void navigateTo(index)} />
        {currentFile && (
          <button
            type="button"
            onClick={saveFile}
            className="rounded bg-black bg-opacity-50 px-3 py-1"
          >
            Save
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowGallery((prev) => !prev)}
          className="ml-auto rounded border border-gray-600 px-3 py-1 text-gray-200 hover:bg-black hover:bg-opacity-30"
        >
          {showGallery ? 'Hide gallery' : 'Smart folder gallery'}
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 flex-shrink-0 space-y-6 overflow-y-auto border-r border-gray-700 bg-black bg-opacity-30 p-3">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                Smart folders
              </h2>
              <button
                type="button"
                onClick={() => setShowGallery(true)}
                className="rounded border border-gray-600 px-2 py-0.5 text-xs text-gray-200 hover:bg-black hover:bg-opacity-30"
              >
                Gallery
              </button>
            </div>
            {hasSmartFolders ? (
              <ul className="space-y-2">
                {smartFolders.map((folder) => {
                  const isActive = selectedSmartFolderId === folder.id;
                  return (
                    <li key={folder.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowGallery(false);
                          setSelectedSmartFolderId(folder.id);
                          void runSmartFolderQuery(folder);
                        }}
                        className={`flex w-full items-center justify-between rounded px-2 py-1 text-left transition ${
                          isActive ? 'bg-ub-orange text-black' : 'hover:bg-black hover:bg-opacity-30'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: folder.accentColor || '#f97316' }}
                          />
                          <span className="truncate">{folder.name}</span>
                        </span>
                        <span className="text-xs text-gray-200">
                          {folder.filters.length} filter{folder.filters.length === 1 ? '' : 's'}
                        </span>
                      </button>
                      <div className="ml-6 mt-1 flex gap-2 text-xs text-gray-300">
                        <button
                          type="button"
                          onClick={() => setEditingFolder(folder)}
                          className="hover:text-white"
                        >
                          Edit
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded border border-dashed border-gray-600 p-3 text-xs text-gray-300">
                Use the gallery to add a template to your sidebar.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Recent</h2>
            {recent.length ? (
              <ul className="space-y-1">
                {recent.map((entry, index) => (
                  <li key={`${entry.name}-${index}`}>
                    <button
                      type="button"
                      onClick={() => void openRecent(entry)}
                      className="w-full rounded px-2 py-1 text-left hover:bg-black hover:bg-opacity-30"
                    >
                      {entry.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">Open a folder to populate this list.</p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Directories</h2>
            <ul className="space-y-1">
              {directories.map((dir) => {
                const key = dir.segments.join('/') || dir.name;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => void openDir(dir)}
                      className="w-full rounded px-2 py-1 text-left hover:bg-black hover:bg-opacity-30"
                    >
                      {dir.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Files</h2>
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.pathKey}>
                  <button
                    type="button"
                    onClick={() => void openFile(file)}
                    className="w-full truncate rounded px-2 py-1 text-left hover:bg-black hover:bg-opacity-30"
                  >
                    {file.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          {showGallery ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-700 bg-black bg-opacity-40 p-3">
                <div>
                  <h2 className="text-base font-semibold">Smart folder gallery</h2>
                  <p className="text-xs text-gray-300">
                    Start with a template and customize filters after saving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGallery(false)}
                  className="rounded border border-gray-600 px-3 py-1 text-gray-200 hover:bg-black hover:bg-opacity-30"
                >
                  Close
                </button>
              </div>
              <SmartFolderGallery templates={SMART_FOLDER_TEMPLATES} onAdd={handleAddTemplate} />
            </>
          ) : showSmartFolderResults && selectedSmartFolder ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-gray-700 bg-black bg-opacity-40 p-3">
                <div>
                  <h2 className="text-base font-semibold">{selectedSmartFolder.name}</h2>
                  <p className="text-xs text-gray-300">{selectedSmartFolder.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFolder(selectedSmartFolder)}
                    className="rounded border border-gray-600 px-3 py-1 text-gray-200 hover:bg-black hover:bg-opacity-30"
                  >
                    Edit filters
                  </button>
                  <button
                    type="button"
                    onClick={() => void runSmartFolderQuery(selectedSmartFolder)}
                    className="rounded border border-gray-600 px-3 py-1 text-gray-200 hover:bg-black hover:bg-opacity-30"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-3">
                {smartFolderLoading && (
                  <p className="text-xs text-gray-300">Evaluating filters…</p>
                )}
                {smartFolderError && (
                  <p className="mb-2 rounded border border-red-500 bg-red-500 bg-opacity-10 p-2 text-xs text-red-200">
                    {smartFolderError}
                  </p>
                )}
                {!smartFolderLoading && !smartFolderResults.length && !smartFolderError && (
                  <p className="text-xs text-gray-300">
                    No files matched the current filters.
                  </p>
                )}
                {smartFolderResults.length > 0 && (
                  <div className="overflow-auto">
                    <table className="min-w-full table-fixed border-separate border-spacing-y-1 text-xs">
                      <thead className="text-left text-gray-300">
                        <tr>
                          <th className="w-1/3 px-2">Name</th>
                          <th className="w-1/3 px-2">Path</th>
                          <th className="w-24 px-2">Size</th>
                          <th className="w-32 px-2">Modified</th>
                          <th className="w-16 px-2">Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {smartFolderResults.map((item) => (
                          <tr key={item.pathKey} className="rounded bg-black bg-opacity-40">
                            <td className="truncate px-2 py-1">{item.name}</td>
                            <td className="truncate px-2 py-1 text-gray-300">
                              {item.pathSegments.slice(0, -1).join('/') || '/'}
                            </td>
                            <td className="px-2 py-1 text-gray-200">{formatBytes(item.size)}</td>
                            <td className="px-2 py-1 text-gray-200">{formatDate(item.lastModified)}</td>
                            <td className="px-2 py-1">
                              <button
                                type="button"
                                onClick={() => void openFile(item)}
                                className="rounded border border-gray-600 px-2 py-0.5 text-gray-200 hover:bg-black hover:bg-opacity-30"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {currentFile ? (
                <textarea
                  className="flex-1 resize-none overflow-auto border-b border-gray-700 bg-black bg-opacity-30 p-2 text-white focus:outline-none"
                  value={content}
                  onChange={handleContentChange}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-300">
                  Select a file from the sidebar or open the smart folder gallery to start.
                </div>
              )}
              <div className="border-t border-gray-700 bg-black bg-opacity-40 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Find in files"
                    className="w-full rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
                  />
                  <button
                    type="button"
                    onClick={runSearch}
                    className="rounded bg-ub-orange px-3 py-1 font-semibold text-black"
                  >
                    Search
                  </button>
                </div>
                <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                  {results.map((result, index) => (
                    <div key={`${result.file}-${result.line}-${index}`} className="rounded bg-black bg-opacity-30 p-2">
                      <span className="font-semibold text-ub-orange">
                        {result.file}:{result.line}
                      </span>
                      <span className="ml-2 text-gray-200">{result.text}</span>
                    </div>
                  ))}
                  {!results.length && (
                    <p className="text-xs text-gray-400">Enter a query to search the current directory.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      {editingFolder && (
        <SmartFolderEditor
          folder={editingFolder}
          onSave={handleSaveFolder}
          onCancel={() => setEditingFolder(null)}
          onDelete={handleDeleteFolder}
        />
      )}
    </div>
  );
};

export default FileExplorer;
