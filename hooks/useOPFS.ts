import { useState, useEffect, useCallback } from 'react';

type DirectoryIterator = AsyncIterableIterator<
  FileSystemHandle | [string, FileSystemHandle]
>;

const getDirectoryIterator = (
  dir: FileSystemDirectoryHandle,
): DirectoryIterator | null => {
  const withEntries = dir as FileSystemDirectoryHandle & {
    entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
    values?: () => AsyncIterableIterator<FileSystemHandle>;
  };

  if (typeof withEntries.entries === 'function') return withEntries.entries();
  if (typeof withEntries.values === 'function') return withEntries.values();

  return null;
};

const isFileHandle = (
  handle: FileSystemHandle,
): handle is FileSystemFileHandle => handle.kind === 'file';

export interface OPFSHook {
  supported: boolean;
  root: FileSystemDirectoryHandle | null;
  getDir: (
    path?: string,
    options?: FileSystemGetDirectoryOptions,
  ) => Promise<FileSystemDirectoryHandle | null>;
  readFile: (
    name: string,
    dir?: FileSystemDirectoryHandle | null,
  ) => Promise<string | null>;
  writeFile: (
    name: string,
    data: string | Blob,
    dir?: FileSystemDirectoryHandle | null,
  ) => Promise<boolean>;
  deleteFile: (
    name: string,
    dir?: FileSystemDirectoryHandle | null,
  ) => Promise<boolean>;
  listFiles: (
    dir?: FileSystemDirectoryHandle | null,
  ) => Promise<FileSystemFileHandle[]>;
}

export default function useOPFS(): OPFSHook {
  const supported =
    typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory;

  const [root, setRoot] = useState<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!supported) return;
    navigator.storage
      .getDirectory()
      .then((dir) => {
        if (!cancelled) setRoot(dir);
      })
      .catch(() => {
        if (!cancelled) setRoot(null);
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const getDir = useCallback<OPFSHook['getDir']>(
    async (path = '', options = { create: true }) => {
      if (!root) return null;
      try {
        let dir: FileSystemDirectoryHandle = root;
        const parts = path
          .split('/')
          .map((p) => p.trim())
          .filter(Boolean);
        for (const part of parts) {
          dir = await dir.getDirectoryHandle(part, options);
        }
        return dir;
      } catch {
        return null;
      }
    },
    [root],
  );

  const readFile = useCallback<OPFSHook['readFile']>(
    async (name, dir: FileSystemDirectoryHandle | null | undefined = root) => {
      if (!dir) return null;
      try {
        const handle = await dir.getFileHandle(name);
        const file = await handle.getFile();
        return await file.text();
      } catch {
        return null;
      }
    },
    [root],
  );

  const writeFile = useCallback<OPFSHook['writeFile']>(
    async (
      name,
      data,
      dir: FileSystemDirectoryHandle | null | undefined = root,
    ) => {
      if (!dir) return false;
      try {
        const handle = await dir.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        return true;
      } catch {
        return false;
      }
    },
    [root],
  );

  const deleteFile = useCallback<OPFSHook['deleteFile']>(
    async (name, dir: FileSystemDirectoryHandle | null | undefined = root) => {
      if (!dir) return false;
      try {
        await dir.removeEntry(name);
        return true;
      } catch {
        return false;
      }
    },
    [root],
  );

  const listFiles = useCallback<OPFSHook['listFiles']>(
    async (dir: FileSystemDirectoryHandle | null | undefined = root) => {
      if (!dir) return [];
      const iterator = getDirectoryIterator(dir);
      if (!iterator) return [];

      const files: FileSystemFileHandle[] = [];
      try {
        for await (const entry of iterator) {
          const handle = Array.isArray(entry) ? entry[1] : entry;
          if (isFileHandle(handle)) files.push(handle);
        }
      } catch {}
      return files;
    },
    [root],
  );

  return { supported, root, getDir, readFile, writeFile, deleteFile, listFiles };
}

