import { useState, useEffect, useCallback } from 'react';

export interface OPFSHook {
  supported: boolean;
  root: FileSystemDirectoryHandle | null;
  getDir: (
    path?: string,
    options?: FileSystemGetDirectoryOptions,
  ) => Promise<FileSystemDirectoryHandle | null>;
  readFile: (
    name: string,
    dir?: FileSystemDirectoryHandle | null | undefined,
  ) => Promise<string | null>;
  writeFile: (
    name: string,
    data: string | Blob,
    dir?: FileSystemDirectoryHandle | null | undefined,
  ) => Promise<boolean>;
  deleteFile: (
    name: string,
    dir?: FileSystemDirectoryHandle | null | undefined,
  ) => Promise<boolean>;
  listFiles: (
    dir?: FileSystemDirectoryHandle | null | undefined,
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
      const files: FileSystemFileHandle[] = [];
      try {
        for await (const entry of (dir as any).values()) {
          if (entry.kind === 'file') files.push(entry as FileSystemFileHandle);
        }
      } catch {}
      return files;
    },
    [root],
  );

  return { supported, root, getDir, readFile, writeFile, deleteFile, listFiles };
}

