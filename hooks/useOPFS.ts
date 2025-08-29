import { useState, useEffect } from 'react';

export interface FileEntry { name: string; kind: 'file' | 'directory'; }

/**
 * React hook providing basic read/write operations on the
 * Origin Private File System (OPFS). Falls back to an
 * in-memory implementation when OPFS is unavailable which
 * allows tests to run in non-browser environments.
 */
export default function useOPFS() {
  const [root, setRoot] = useState<FileSystemDirectoryHandle | null>(null);
  const [useMemory, setUseMemory] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
          const dir = await navigator.storage.getDirectory();
          setRoot(dir);
          setHasAccess(true);
        } else {
          setUseMemory(true);
          setHasAccess(true);
        }
      } catch {
        setHasAccess(false);
      }
    })();
  }, []);

  const list = async (path: string) => {
    if (!hasAccess) throw new Error('Permission denied');
    return useMemory ? memList(path) : opfsList(root!, path);
  };

  const readFile = async (path: string) => {
    if (!hasAccess) throw new Error('Permission denied');
    return useMemory ? memReadFile(path) : opfsReadFile(root!, path);
  };

  const writeFile = async (path: string, content: string) => {
    if (!hasAccess) throw new Error('Permission denied');
    return useMemory ? memWriteFile(path, content) : opfsWriteFile(root!, path, content);
  };

  const mkdir = async (path: string) => {
    if (!hasAccess) throw new Error('Permission denied');
    return useMemory ? memMkdir(path) : opfsMkdir(root!, path);
  };

  const rm = async (path: string) => {
    if (!hasAccess) throw new Error('Permission denied');
    return useMemory ? memRm(path) : opfsRm(root!, path);
  };

  return { hasAccess, list, readFile, writeFile, mkdir, rm };
}

// ----------------- Memory FS implementation -----------------

interface DirNode { kind: 'directory'; entries: Record<string, Node>; }
interface FileNode { kind: 'file'; content: string; }
type Node = DirNode | FileNode;

const memRoot: DirNode = { kind: 'directory', entries: {} };

function normalize(path: string) {
  const parts = path.split('/').filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return '/' + stack.join('/');
}

function getMemNode(path: string, create = false, type: 'directory' | 'file' = 'directory'): Node | null {
  let node: Node = memRoot;
  const parts = normalize(path).split('/').filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (node.kind !== 'directory') return null;
    let next = node.entries[part];
    if (!next) {
      if (create) {
        next = i === parts.length - 1 && type === 'file'
          ? { kind: 'file', content: '' }
          : { kind: 'directory', entries: {} };
        node.entries[part] = next;
      } else return null;
    }
    node = next;
  }
  return node;
}

async function memList(path: string): Promise<FileEntry[]> {
  const node = getMemNode(path);
  if (!node || node.kind !== 'directory') throw new Error('Not found');
  return Object.entries(node.entries).map(([name, n]) => ({ name, kind: n.kind }));
}

async function memReadFile(path: string): Promise<string> {
  const node = getMemNode(path);
  if (!node || node.kind !== 'file') throw new Error('Not found');
  return node.content;
}

async function memWriteFile(path: string, content: string) {
  const dirPath = path.split('/').slice(0, -1).join('/') || '/';
  const fileName = path.split('/').pop()!;
  const dir = getMemNode(dirPath, true, 'directory') as DirNode;
  dir.entries[fileName] = { kind: 'file', content };
}

async function memMkdir(path: string) {
  getMemNode(path, true, 'directory');
}

async function memRm(path: string) {
  const parts = normalize(path).split('/').filter(Boolean);
  const name = parts.pop();
  const dir = getMemNode(parts.join('/')) as DirNode | null;
  if (!dir || dir.kind !== 'directory' || !name) throw new Error('Not found');
  delete dir.entries[name];
}

// ----------------- OPFS implementation -----------------

async function opfsGetDir(root: FileSystemDirectoryHandle, path: string, create = false) {
  let dir = root;
  const parts = normalize(path).split('/').filter(Boolean);
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create });
  }
  return dir;
}

async function opfsList(root: FileSystemDirectoryHandle, path: string): Promise<FileEntry[]> {
  const dir = await opfsGetDir(root, path);
  const items: FileEntry[] = [];
  for await (const [name, handle] of dir.entries()) items.push({ name, kind: handle.kind });
  return items;
}

async function opfsReadFile(root: FileSystemDirectoryHandle, path: string): Promise<string> {
  const parts = normalize(path).split('/').filter(Boolean);
  const fileName = parts.pop();
  const dir = await opfsGetDir(root, parts.join('/'));
  const fileHandle = await dir.getFileHandle(fileName!);
  const file = await fileHandle.getFile();
  return await file.text();
}

async function opfsWriteFile(root: FileSystemDirectoryHandle, path: string, content: string) {
  const parts = normalize(path).split('/').filter(Boolean);
  const fileName = parts.pop()!;
  const dir = await opfsGetDir(root, parts.join('/'), true);
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function opfsMkdir(root: FileSystemDirectoryHandle, path: string) {
  await opfsGetDir(root, path, true);
}

async function opfsRm(root: FileSystemDirectoryHandle, path: string) {
  const parts = normalize(path).split('/').filter(Boolean);
  const name = parts.pop();
  const dir = await opfsGetDir(root, parts.join('/'));
  await dir.removeEntry(name!, { recursive: true });
}
