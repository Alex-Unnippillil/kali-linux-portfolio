"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useOPFS from '../../hooks/useOPFS';
import Breadcrumbs from '../ui/Breadcrumbs';
import TagPicker from '../TagPicker';
import {
  addRecentDirectory,
  getRecentDirectories,
  listSavedQueries,
  createSavedQuery,
  deleteSavedQuery,
  getTagAssignmentsForPaths,
  exportExplorerMetadata,
  importExplorerMetadata,
  filterResultsByTagIds,
} from '../../utils/fileExplorerStorage';
import type {
  ExplorerExportPayload,
  RecentDirectoryEntry,
  SavedQueryRecord,
  SearchResult,
  TagRecord,
} from '../../utils/fileExplorerStorage';

type FilePickerOptions = any;

export async function openFileDialog(options: FilePickerOptions = {}) {
  if (typeof window !== 'undefined' && (window as any).showOpenFilePicker) {
    const [handle] = await (window as any).showOpenFilePicker(options);
    return handle as FileSystemFileHandle;
  }

  return await new Promise<FileSystemFileHandle | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options?.multiple) input.multiple = true;
    if (options?.types) {
      const accept = options.types
        .map((t: any) => t.accept && Object.values(t.accept).flat())
        .flat()
        .join(',');
      if (accept) input.accept = accept;
    }
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        name: file.name,
        kind: 'file',
        async getFile() {
          return file;
        },
      } as unknown as FileSystemFileHandle);
    };
    input.click();
  });
}

export async function saveFileDialog(options: FilePickerOptions = {}) {
  if (typeof window !== 'undefined' && (window as any).showSaveFilePicker) {
    return await (window as any).showSaveFilePicker(options);
  }

  return {
    name: options?.suggestedName || 'download',
    async createWritable() {
      return {
        async write(data: Blob | string) {
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

interface DirectoryEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
  fullPath: string;
}

interface FileEntry {
  name: string;
  handle: FileSystemFileHandle;
  fullPath: string;
}

interface BreadcrumbEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
  fullPath: string;
}

type CurrentFile = {
  name: string;
  path: string;
  handle?: FileSystemFileHandle;
};

interface RunSearchOptions {
  query?: string;
  filters?: string[];
  keepActiveSavedQuery?: boolean;
  directoryHandle?: FileSystemDirectoryHandle | null;
  basePath?: string;
}

const joinPath = (base: string, name: string) => (base ? `${base}/${name}` : name);

const bufferKeyForPath = (path: string | undefined, fallback: string) =>
  `buffer_${(path || fallback || 'file').replace(/[\\/]/g, '__')}`;

export default function FileExplorer({
  context,
  initialPath,
  path: pathProp,
}: {
  context?: { initialPath?: string; path?: string } | null;
  initialPath?: string;
  path?: string;
} = {}) {
  const [supported, setSupported] = useState(true);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dirs, setDirs] = useState<DirectoryEntry[]>([]);
  const [path, setPath] = useState<BreadcrumbEntry[]>([]);
  const [recent, setRecent] = useState<RecentDirectoryEntry[]>([]);
  const [currentFile, setCurrentFile] = useState<CurrentFile | null>(null);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [savedQueryName, setSavedQueryName] = useState('');
  const [savedQueries, setSavedQueries] = useState<SavedQueryRecord[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagRecord[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [rawResults, setRawResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [activeSavedQueryId, setActiveSavedQueryId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [tagPickerRefreshKey, setTagPickerRefreshKey] = useState(0);
  const [assignmentVersion, setAssignmentVersion] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);
  const tagCacheRef = useRef<Map<string, string[]>>(new Map());

  const { supported: opfsSupported, root, getDir, readFile: opfsRead, writeFile: opfsWrite, deleteFile: opfsDelete } = useOPFS();
  const [unsavedDir, setUnsavedDir] = useState<FileSystemDirectoryHandle | null>(null);

  const currentDirectoryPath = path[path.length - 1]?.fullPath ?? '';

  const saveBuffer = useCallback(
    async (key: string, data: string) => {
      if (unsavedDir) {
        await opfsWrite(key, data, unsavedDir);
      }
    },
    [opfsWrite, unsavedDir],
  );

  const loadBuffer = useCallback(
    async (key: string, fallback: string) => {
      if (!unsavedDir) return null;
      const latest = await opfsRead(key, unsavedDir);
      if (latest !== null) return latest;
      return await opfsRead(fallback, unsavedDir);
    },
    [opfsRead, unsavedDir],
  );

  const removeBuffer = useCallback(
    async (key: string, fallback: string) => {
      if (unsavedDir) {
        await opfsDelete(key, unsavedDir);
        await opfsDelete(fallback, unsavedDir);
      }
    },
    [opfsDelete, unsavedDir],
  );

  const readDir = useCallback(
    async (handle: FileSystemDirectoryHandle, basePath: string) => {
      const directories: DirectoryEntry[] = [];
      const filesList: FileEntry[] = [];
      try {
        for await (const [name, entry] of handle.entries() as any) {
          if (entry.kind === 'file') {
            filesList.push({
              name,
              handle: entry as FileSystemFileHandle,
              fullPath: joinPath(basePath, name),
            });
          } else if (entry.kind === 'directory') {
            directories.push({
              name,
              handle: entry as FileSystemDirectoryHandle,
              fullPath: joinPath(basePath, name),
            });
          }
        }
      } catch (error) {
        console.error('Failed to read directory', error);
      }
      directories.sort((a, b) => a.name.localeCompare(b.name));
      filesList.sort((a, b) => a.name.localeCompare(b.name));
      setDirs(directories);
      setFiles(filesList);
      setSelectedPaths([]);
    },
    [],
  );

  const buildCrumbsForPath = useCallback(
    async (requested: string) => {
      if (!opfsSupported || !root) return null;
      const sanitized = (requested || '')
        .replace(/^~\//, 'home/kali/')
        .replace(/^\/+/, '')
        .trim();
      const crumbs: BreadcrumbEntry[] = [
        { name: root.name || '/', handle: root, fullPath: '' },
      ];
      if (!sanitized) {
        return { handle: root, crumbs, currentPath: '' };
      }
      try {
        let current: FileSystemDirectoryHandle = root;
        let currentPath = '';
        const segments = sanitized
          .split('/')
          .map((segment) => segment.trim())
          .filter(Boolean);
        for (const segment of segments) {
          current = await current.getDirectoryHandle(segment, { create: true });
          currentPath = joinPath(currentPath, segment);
          crumbs.push({ name: segment, handle: current, fullPath: currentPath });
        }
        return { handle: current, crumbs, currentPath };
      } catch (error) {
        console.error('Unable to open requested path', requested, error);
        return null;
      }
    },
    [opfsSupported, root],
  );

  const openDirectoryFromPath = useCallback(
    async (requested: string) => {
      const result = await buildCrumbsForPath(requested);
      if (!result) return null;
      setDirHandle(result.handle);
      setPath(result.crumbs);
      await readDir(result.handle, result.currentPath);
      setLocationError(null);
      return result;
    },
    [buildCrumbsForPath, readDir],
  );

  useEffect(() => {
    const hasPicker =
      typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
    setSupported(hasPicker);
    if (hasPicker) {
      getRecentDirectories().then(setRecent).catch(() => setRecent([]));
    }
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    let cancelled = false;
    (async () => {
      const dir = await getDir('unsaved');
      if (!cancelled) setUnsavedDir(dir ?? null);
      if (!cancelled) {
        await openDirectoryFromPath('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getDir, openDirectoryFromPath, opfsSupported, root]);

  useEffect(() => {
    const requested =
      (context?.initialPath ?? context?.path ?? initialPath ?? pathProp) || '';
    if (!requested) return;
    let cancelled = false;
    (async () => {
      const result = await openDirectoryFromPath(requested);
      if (!result && !cancelled) {
        setLocationError(`Unable to open ${requested}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context, initialPath, pathProp, openDirectoryFromPath]);

  const openFallback = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCurrentFile({ name: file.name, path: file.name });
    setSelectedPaths([file.name]);
    setContent(text);
  };

  const openFolder = async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) return;
      const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
      setDirHandle(handle);
      await addRecentDirectory(handle);
      setRecent(await getRecentDirectories());
      setPath([{ name: handle.name || '/', handle, fullPath: '' }]);
      await readDir(handle, '');
      setLocationError(null);
    } catch (error) {
      console.error('Failed to open folder', error);
    }
  };

  const openRecent = async (entry: RecentDirectoryEntry) => {
    try {
      const hasPermission =
        typeof entry.handle.requestPermission === 'function'
          ? await entry.handle.requestPermission({ mode: 'readwrite' })
          : 'granted';
      if (hasPermission !== 'granted') return;
      setDirHandle(entry.handle);
      setPath([{ name: entry.name, handle: entry.handle, fullPath: '' }]);
      await readDir(entry.handle, '');
      setLocationError(null);
    } catch (error) {
      console.error('Failed to open recent directory', error);
    }
  };

  const openDir = async (dir: DirectoryEntry) => {
    setDirHandle(dir.handle);
    setPath((prev) => [...prev, { name: dir.name, handle: dir.handle, fullPath: dir.fullPath }]);
    await readDir(dir.handle, dir.fullPath);
    setLocationError(null);
  };

  const navigateTo = async (index: number) => {
    const target = path[index];
    if (!target) return;
    setDirHandle(target.handle);
    setPath(path.slice(0, index + 1));
    await readDir(target.handle, target.fullPath);
    setLocationError(null);
  };

  const goBack = async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    const prev = newPath[newPath.length - 1];
    setPath(newPath);
    if (prev) {
      setDirHandle(prev.handle);
      await readDir(prev.handle, prev.fullPath);
      setLocationError(null);
    }
  };

  const openFile = async (file: FileEntry) => {
    setCurrentFile({ name: file.name, path: file.fullPath, handle: file.handle });
    setSelectedPaths([file.fullPath]);
    let text = '';
    if (opfsSupported) {
      const unsaved = await loadBuffer(
        bufferKeyForPath(file.fullPath, file.name),
        file.name,
      );
      if (unsaved !== null) text = unsaved;
    }
    if (!text) {
      const fetched = await file.handle.getFile();
      text = await fetched.text();
    }
    setContent(text);
  };

  const saveFile = async () => {
    if (!currentFile?.handle) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) {
        await removeBuffer(
          bufferKeyForPath(currentFile.path, currentFile.name),
          currentFile.name,
        );
      }
    } catch (error) {
      console.error('Failed to save file', error);
    }
  };

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setContent(text);
    if (opfsSupported && currentFile?.path) {
      saveBuffer(bufferKeyForPath(currentFile.path, currentFile.name), text);
    }
  };

  const toggleSelection = (fullPath: string) => {
    setSelectedPaths((prev) =>
      prev.includes(fullPath)
        ? prev.filter((value) => value !== fullPath)
        : [...prev, fullPath],
    );
  };

  const handleAssignmentsChanged = useCallback(() => {
    tagCacheRef.current.clear();
    setAssignmentVersion((value) => value + 1);
  }, []);

  const refreshSavedQueries = useCallback(async () => {
    try {
      const data = await listSavedQueries();
      setSavedQueries(data);
    } catch (error) {
      console.error('Failed to load saved queries', error);
      setSavedQueries([]);
    }
  }, []);

  useEffect(() => {
    refreshSavedQueries();
  }, [refreshSavedQueries]);

  useEffect(() => {
    setTagFilters((prev) => prev.filter((id) => availableTags.some((tag) => tag.id === id)));
  }, [availableTags]);

  const runSearch = useCallback(
    (options: RunSearchOptions = {}) => {
      const directoryHandle = options.directoryHandle ?? dirHandle;
      const searchQuery = (options.query ?? query).trim();
      const filters = options.filters ?? tagFilters;
      const basePath = options.basePath ?? currentDirectoryPath;

      if (!directoryHandle || !searchQuery) return;
      if (options.query !== undefined) setQuery(options.query);
      if (options.filters !== undefined) setTagFilters(options.filters);
      if (!options.keepActiveSavedQuery) setActiveSavedQueryId(null);

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

      const worker = new Worker(new URL('./find.worker.js', import.meta.url));
      workerRef.current = worker;
      setRawResults([]);
      setFilteredResults([]);
      tagCacheRef.current.clear();
      setIsSearching(true);

      worker.onmessage = (event: MessageEvent) => {
        const { file, line, text, done } = event.data || {};
        if (done) {
          setIsSearching(false);
          workerRef.current?.terminate();
          workerRef.current = null;
          return;
        }
        const absolutePath = joinPath(basePath, file);
        setRawResults((prev) => [...prev, { file: absolutePath, line, text }]);
      };

      worker.postMessage({ directoryHandle, query: searchQuery });
    },
    [currentDirectoryPath, dirHandle, query, tagFilters],
  );

  const toggleTagFilter = (tagId: string) => {
    setTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((value) => value !== tagId) : [...prev, tagId],
    );
    setActiveSavedQueryId(null);
  };

  const handleSaveQuery = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    const name = savedQueryName.trim() || trimmedQuery;
    try {
      await createSavedQuery({
        name,
        query: trimmedQuery,
        filters: { tags: tagFilters.slice(), directory: currentDirectoryPath },
      });
      setSavedQueryName('');
      await refreshSavedQueries();
    } catch (error) {
      console.error('Failed to save query', error);
    }
  };

  const applySavedQuery = async (saved: SavedQueryRecord) => {
    const filters = saved.filters?.tags || [];
    const directory = saved.filters?.directory || '';
    let overrideHandle: FileSystemDirectoryHandle | null = null;
    let overrideBasePath = currentDirectoryPath;
    if (directory && directory !== currentDirectoryPath) {
      const opened = await openDirectoryFromPath(directory);
      if (opened) {
        overrideHandle = opened.handle;
        overrideBasePath = opened.currentPath;
      }
    }
    setActiveSavedQueryId(saved.id);
    runSearch({
      query: saved.query,
      filters,
      keepActiveSavedQuery: true,
      directoryHandle: overrideHandle ?? dirHandle,
      basePath: overrideBasePath,
    });
  };

  const handleDeleteSavedQuery = async (id: string) => {
    try {
      await deleteSavedQuery(id);
      await refreshSavedQueries();
      if (activeSavedQueryId === id) setActiveSavedQueryId(null);
    } catch (error) {
      console.error('Failed to delete saved query', error);
    }
  };

  const handleExportMetadata = async () => {
    try {
      const payload = await exportExplorerMetadata();
      if (!payload) return;
      const handle = await saveFileDialog({
        suggestedName: 'file-explorer-metadata.json',
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      console.error('Failed to export metadata', error);
      setLocationError('Unable to export metadata');
    }
  };

  const handleImportMetadata = async () => {
    try {
      const handle = await openFileDialog({
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      if (!handle) return;
      const file = await handle.getFile();
      const text = await file.text();
      const payload = JSON.parse(text) as ExplorerExportPayload;
      await importExplorerMetadata(payload);
      setTagPickerRefreshKey((value) => value + 1);
      await refreshSavedQueries();
      tagCacheRef.current.clear();
      setAssignmentVersion((value) => value + 1);
      setLocationError(null);
    } catch (error) {
      console.error('Failed to import metadata', error);
      setLocationError('Unable to import metadata');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const applyFilters = async () => {
      if (!tagFilters.length) {
        if (!cancelled) setFilteredResults(rawResults);
        return;
      }
      const uniquePaths = Array.from(new Set(rawResults.map((result) => result.file)));
      const missing = uniquePaths.filter((path) => !tagCacheRef.current.has(path));
      if (missing.length) {
        const fetched = await getTagAssignmentsForPaths(missing);
        if (cancelled) return;
        for (const path of missing) {
          tagCacheRef.current.set(path, fetched[path] || []);
        }
      }
      const assignmentMap: Record<string, string[]> = {};
      for (const path of uniquePaths) {
        assignmentMap[path] = tagCacheRef.current.get(path) || [];
      }
      const filtered = filterResultsByTagIds(rawResults, assignmentMap, tagFilters);
      if (!cancelled) setFilteredResults(filtered);
    };
    applyFilters();
    return () => {
      cancelled = true;
    };
  }, [rawResults, tagFilters, assignmentVersion]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
    },
    [],
  );

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
      <div className="flex items-center flex-wrap gap-2 p-2 bg-ub-warm-grey bg-opacity-40">
        <button onClick={openFolder} className="px-2 py-1 bg-black bg-opacity-50 rounded">
          Open Folder
        </button>
        {path.length > 1 && (
          <button onClick={goBack} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Back
          </button>
        )}
        <Breadcrumbs path={path} onNavigate={navigateTo} />
        {locationError && (
          <div className="text-xs text-red-300" role="status">
            {locationError}
          </div>
        )}
        {currentFile?.handle && (
          <button onClick={saveFile} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 overflow-auto border-r border-gray-600 flex-shrink-0">
          <div className="p-2 font-bold">Recent</div>
          {recent.map((entry, index) => (
            <div
              key={index}
              className="px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openRecent(entry)}
            >
              {entry.name}
            </div>
          ))}
          <div className="p-2 font-bold">Directories</div>
          {dirs.map((dir) => (
            <div
              key={dir.fullPath}
              className="px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-30"
              onClick={() => openDir(dir)}
            >
              {dir.name}
            </div>
          ))}
          <div className="p-2 font-bold">Files</div>
          {files.map((file) => {
            const isSelected = selectedPaths.includes(file.fullPath);
            return (
              <div
                key={file.fullPath}
                className="px-2 py-1 flex items-center justify-between gap-2 hover:bg-black hover:bg-opacity-30"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(file.fullPath)}
                  />
                  <span>{file.name}</span>
                </label>
                <button onClick={() => openFile(file)} className="text-xs underline">
                  Open
                </button>
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
          <div className="flex flex-col md:flex-row border-t border-gray-600 min-h-[18rem]">
            <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-gray-600 p-3 overflow-auto">
              <TagPicker
                selectedPaths={selectedPaths}
                onTagsChange={setAvailableTags}
                onAssignmentsChange={handleAssignmentsChanged}
                refreshKey={tagPickerRefreshKey}
              />
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-auto">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find in files"
                  className="px-2 py-1 text-black flex-1 min-w-[12rem]"
                />
                <button onClick={() => runSearch()} className="px-2 py-1 bg-black bg-opacity-50 rounded">
                  Search
                </button>
                <button onClick={handleExportMetadata} className="px-2 py-1 bg-black bg-opacity-50 rounded">
                  Export Metadata
                </button>
                <button onClick={handleImportMetadata} className="px-2 py-1 bg-black bg-opacity-50 rounded">
                  Import Metadata
                </button>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-300 mb-1">Filter by tags</div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <label key={tag.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={tagFilters.includes(tag.id)}
                        onChange={() => toggleTagFilter(tag.id)}
                      />
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block w-3 h-3 rounded"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.label}
                      </span>
                    </label>
                  ))}
                  {availableTags.length === 0 && (
                    <div className="text-xs text-gray-300">No tags available.</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={savedQueryName}
                  onChange={(event) => setSavedQueryName(event.target.value)}
                  placeholder="Save search as..."
                  className="px-2 py-1 text-black flex-1 min-w-[10rem]"
                />
                <button onClick={handleSaveQuery} className="px-2 py-1 bg-black bg-opacity-50 rounded">
                  Save Search
                </button>
                {activeSavedQueryId && (
                  <button
                    onClick={() => setActiveSavedQueryId(null)}
                    className="px-2 py-1 bg-black bg-opacity-30 rounded"
                  >
                    Clear Active
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-24 overflow-auto">
                {savedQueries.map((saved) => (
                  <div
                    key={saved.id}
                    className={`flex items-center justify-between px-2 py-1 rounded ${
                      activeSavedQueryId === saved.id ? 'bg-black bg-opacity-40' : 'bg-black bg-opacity-20'
                    }`}
                  >
                    <button
                      onClick={() => applySavedQuery(saved)}
                      className="text-left text-xs font-semibold flex-1"
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedQuery(saved.id)}
                      className="text-xs underline ml-2"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {savedQueries.length === 0 && (
                  <div className="text-xs text-gray-300">No saved searches yet.</div>
                )}
              </div>
              <div className="border border-gray-700 rounded p-2 bg-black bg-opacity-20 max-h-52 overflow-auto space-y-1">
                <div className="text-xs text-gray-300">
                  Showing {filteredResults.length} of {rawResults.length} matches
                  {isSearching ? ' (searching...)' : ''}
                </div>
                {!isSearching && rawResults.length === 0 && (
                  <div className="text-xs text-gray-300">No results yet. Run a search to see matches.</div>
                )}
                {!isSearching && rawResults.length > 0 && filteredResults.length === 0 && tagFilters.length > 0 && (
                  <div className="text-xs text-gray-300">All results filtered out by the selected tags.</div>
                )}
                {filteredResults.map((result, index) => (
                  <div key={`${result.file}-${result.line}-${index}`} className="text-xs">
                    <span className="font-bold">{result.file}:{result.line}</span> {result.text}
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

