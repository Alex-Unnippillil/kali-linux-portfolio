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

function useOPFSCore(): OPFSHook {
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

export default function useOPFS(): OPFSHook;
export default function useOPFS<T>(
  name: string,
  initialValue: T,
): [T, (v: T) => Promise<void>, boolean];
export default function useOPFS<T>(
  name?: string,
  initialValue?: T,
): OPFSHook | [T, (v: T) => Promise<void>, boolean] {
  const core = useOPFSCore();
  const { supported, getDir, readFile, writeFile } = core;
  const [value, setValue] = useState<T>(initialValue as T);
  const [ready, setReady] = useState(name === undefined);

  useEffect(() => {
    if (name === undefined) return;
    let active = true;
    if (!supported) {
      setReady(true);
      return;
    }
    (async () => {
      const dir = await getDir();
      if (!dir) {
        if (active) setReady(true);
        return;
      }
      try {
        const text = await readFile(name, dir);
        if (text && active) setValue(JSON.parse(text));
      } catch {
        await writeFile(name, JSON.stringify(initialValue), dir);
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [supported, name, initialValue, getDir, readFile, writeFile]);

  const save = useCallback(
    async (v: T) => {
      setValue(v);
      if (!supported || name === undefined) return;
      const dir = await getDir();
      if (!dir) return;
      try {
        await writeFile(name, JSON.stringify(v), dir);
      } catch {}
    },
    [supported, name, getDir, writeFile],
  );

  if (name === undefined) {
    return core;
  }
  return [value, save, ready];
}

