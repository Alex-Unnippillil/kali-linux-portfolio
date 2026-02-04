import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchRecentDirectories,
  persistRecentDirectory,
  RecentDirectoryEntry,
} from '../services/fileExplorer/recents';

export interface DirectoryEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
}

export interface FileEntry {
  name: string;
  handle: FileSystemFileHandle;
}

export type Breadcrumb = DirectoryEntry;

interface SyncOptions {
  breadcrumbs?: Breadcrumb[];
  setAsRoot?: boolean;
}

interface OpenHandleOptions {
  breadcrumbName?: string;
  breadcrumbs?: Breadcrumb[];
  setAsRoot?: boolean;
  recordRecent?: boolean;
}

interface DirectoryHandleWithEntries extends FileSystemDirectoryHandle {
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
}

interface DirectoryHandleWithValues extends FileSystemDirectoryHandle {
  values: () => AsyncIterableIterator<FileSystemHandle>;
}

function isDirectoryHandle(
  handle: FileSystemHandle,
): handle is FileSystemDirectoryHandle {
  return handle.kind === 'directory';
}

function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === 'file';
}

function hasEntries(
  handle: FileSystemDirectoryHandle,
): handle is DirectoryHandleWithEntries {
  return typeof (handle as DirectoryHandleWithEntries).entries === 'function';
}

function hasValues(
  handle: FileSystemDirectoryHandle,
): handle is DirectoryHandleWithValues {
  return typeof (handle as DirectoryHandleWithValues).values === 'function';
}

interface UseFileSystemNavigatorReturn {
  currentDirectory: FileSystemDirectoryHandle | null;
  directories: DirectoryEntry[];
  files: FileEntry[];
  breadcrumbs: Breadcrumb[];
  recent: RecentDirectoryEntry[];
  locationError: string | null;
  openHandle: (handle: FileSystemDirectoryHandle, options?: OpenHandleOptions) => Promise<void>;
  enterDirectory: (entry: DirectoryEntry) => Promise<void>;
  navigateTo: (index: number) => Promise<void>;
  goBack: () => Promise<void>;
  openPath: (path: string) => Promise<void>;
  refreshRecents: () => Promise<void>;
  setLocationError: (value: string | null) => void;
}

async function iterateEntries(handle: FileSystemDirectoryHandle) {
  const directories: DirectoryEntry[] = [];
  const files: FileEntry[] = [];

  if (!handle || !hasEntries(handle)) {
    if (!handle || !hasValues(handle)) {
      return { directories, files };
    }
    for await (const entry of handle.values()) {
      if (!entry) continue;
      if (isDirectoryHandle(entry)) {
        directories.push({ name: entry.name, handle: entry });
      } else if (isFileHandle(entry)) {
        files.push({ name: entry.name, handle: entry });
      }
    }
  } else {
    for await (const [name, entry] of handle.entries()) {
      if (!entry) continue;
      if (isDirectoryHandle(entry)) {
        directories.push({ name, handle: entry });
      } else if (isFileHandle(entry)) {
        files.push({ name, handle: entry });
      }
    }
  }

  directories.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return { directories, files };
}

export default function useFileSystemNavigator(): UseFileSystemNavigatorReturn {
  const [root, setRoot] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [recent, setRecent] = useState<RecentDirectoryEntry[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);

  const activeRequestRef = useRef(0);

  const refreshRecents = useCallback(async () => {
    const entries = await fetchRecentDirectories();
    setRecent(entries);
  }, []);

  useEffect(() => {
    refreshRecents();
  }, [refreshRecents]);

  const syncDirectory = useCallback(
    async (handle: FileSystemDirectoryHandle, options: SyncOptions = {}) => {
      const requestId = Date.now();
      activeRequestRef.current = requestId;
      setLocationError(null);
      try {
        const { directories: nextDirs, files: nextFiles } = await iterateEntries(handle);
        if (activeRequestRef.current !== requestId) return;
        if (options.setAsRoot) setRoot(handle);
        setCurrentDirectory(handle);
        setBreadcrumbs(
          options.breadcrumbs ?? [{ name: handle.name || '/', handle }],
        );
        setDirectories(nextDirs);
        setFiles(nextFiles);
      } catch (error) {
        if (activeRequestRef.current !== requestId) return;
        const message =
          error instanceof Error
            ? error.name === 'NotAllowedError'
              ? 'Permission denied when reading directory. Please re-open and grant access.'
              : error.message
            : 'Unable to read directory contents';
        setLocationError(message);
      }
    },
    [],
  );

  const openHandle = useCallback<UseFileSystemNavigatorReturn['openHandle']>(
    async (handle, options = {}) => {
      const breadcrumbName = options.breadcrumbName ?? handle.name ?? '/';
      const crumbs =
        options.breadcrumbs ?? [{ name: breadcrumbName, handle }];
      await syncDirectory(handle, {
        breadcrumbs: crumbs,
        setAsRoot: options.setAsRoot,
      });
      if (options.recordRecent) {
        await persistRecentDirectory(handle, breadcrumbName).catch(() => {});
        await refreshRecents();
      }
    },
    [refreshRecents, syncDirectory],
  );

  const enterDirectory = useCallback<UseFileSystemNavigatorReturn['enterDirectory']>(
    async (entry) => {
      if (!entry?.handle) return;
      const crumbs = [...breadcrumbs, { name: entry.name, handle: entry.handle }];
      await syncDirectory(entry.handle, { breadcrumbs: crumbs });
    },
    [breadcrumbs, syncDirectory],
  );

  const navigateTo = useCallback<UseFileSystemNavigatorReturn['navigateTo']>(
    async (index) => {
      const target = breadcrumbs[index];
      if (!target?.handle) return;
      const crumbs = breadcrumbs.slice(0, index + 1);
      await syncDirectory(target.handle, { breadcrumbs: crumbs });
    },
    [breadcrumbs, syncDirectory],
  );

  const goBack = useCallback<UseFileSystemNavigatorReturn['goBack']>(async () => {
    if (breadcrumbs.length <= 1) return;
    const nextCrumbs = breadcrumbs.slice(0, -1);
    const previous = nextCrumbs[nextCrumbs.length - 1];
    if (!previous?.handle) return;
    await syncDirectory(previous.handle, { breadcrumbs: nextCrumbs });
  }, [breadcrumbs, syncDirectory]);

  const openPath = useCallback<UseFileSystemNavigatorReturn['openPath']>(
    async (path) => {
      if (!root) return;
      const sanitized = path
        .replace(/^~\//, 'home/kali/')
        .replace(/^\/+/, '')
        .trim();
      if (!sanitized) {
        await syncDirectory(root, {
          breadcrumbs: [{ name: root.name || '/', handle: root }],
          setAsRoot: true,
        });
        return;
      }

      try {
        let current = root;
        const crumbs: Breadcrumb[] = [{ name: root.name || '/', handle: root }];
        const segments = sanitized
          .split('/')
          .map((segment) => segment.trim())
          .filter(Boolean);
        for (const segment of segments) {
          current = await current.getDirectoryHandle(segment, { create: false });
          crumbs.push({ name: segment, handle: current });
        }
        await syncDirectory(current, { breadcrumbs: crumbs });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.name === 'NotFoundError'
              ? `Path not found: ${path}`
              : error.message
            : `Unable to open ${path}`;
        setLocationError(message);
      }
    },
    [root, syncDirectory],
  );

  return {
    currentDirectory,
    directories,
    files,
    breadcrumbs,
    recent,
    locationError,
    openHandle,
    enterDirectory,
    navigateTo,
    goBack,
    openPath,
    refreshRecents,
    setLocationError,
  };
}
