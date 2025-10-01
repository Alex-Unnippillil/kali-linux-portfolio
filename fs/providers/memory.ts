import { MemoryProvider as MemoryProviderInterface, VirtualEntry } from './types';

export interface MemoryProviderOptions {
  label?: string;
  readOnly?: boolean;
  files?: Record<string, string | Uint8Array>;
}

type MemoryNode = {
  name: string;
  kind: 'file' | 'directory';
  children: Map<string, MemoryNode>;
  data?: Uint8Array;
  lastModified: number;
  size?: number;
};

function normalizePath(path: string): string {
  if (!path) return '/';
  if (!path.startsWith('/')) return `/${path}`;
  return path.replace(/\\+/g, '/');
}

function splitPath(path: string): string[] {
  return normalizePath(path)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function encodeData(data: string | Uint8Array): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  return data;
}

function decodeData(data: Uint8Array, asText: boolean): string | Uint8Array {
  if (!asText) return data;
  return new TextDecoder().decode(data);
}

export class MemoryFileSystemProvider implements MemoryProviderInterface {
  readonly id: string;
  readonly label: string;
  readonly readOnly: boolean;

  private root: MemoryNode;

  constructor(options: MemoryProviderOptions = {}) {
    this.id = `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.label = options.label ?? 'Memory';
    this.readOnly = !!options.readOnly;
    this.root = {
      name: '',
      kind: 'directory',
      children: new Map(),
      lastModified: Date.now(),
    };

    if (options.files) {
      for (const [path, data] of Object.entries(options.files)) {
        this.writeFile(path, data).catch(() => {
          /* ignore initialisation errors */
        });
      }
    }
  }

  private traverse(path: string, create = false): MemoryNode | null {
    const parts = splitPath(path);
    let current = this.root;
    if (parts.length === 0) return current;
    for (const part of parts) {
      let next = current.children.get(part);
      if (!next) {
        if (!create) return null;
        next = {
          name: part,
          kind: 'directory',
          children: new Map(),
          lastModified: Date.now(),
        };
        current.children.set(part, next);
      }
      if (next.kind !== 'directory') return null;
      current = next;
    }
    return current;
  }

  private getNode(path: string): MemoryNode | null {
    const parts = splitPath(path);
    let current: MemoryNode = this.root;
    for (const [index, part] of parts.entries()) {
      const next = current.children.get(part);
      if (!next) return null;
      if (index === parts.length - 1) return next;
      if (next.kind !== 'directory') return null;
      current = next;
    }
    return parts.length === 0 ? current : null;
  }

  async list(path: string): Promise<VirtualEntry[]> {
    const node = path ? this.traverse(path) : this.root;
    if (!node || node.kind !== 'directory') return [];
    const entries: VirtualEntry[] = [];
    for (const child of node.children.values()) {
      entries.push({
        name: child.name,
        path: `${normalizePath(path).replace(/\/$/, '')}/${child.name}`.replace('//', '/'),
        kind: child.kind,
        size: child.size,
        lastModified: child.lastModified,
      });
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  async readFile(path: string, options?: { as?: 'text' | 'uint8array' }): Promise<string | Uint8Array | null> {
    const node = this.getNode(path);
    if (!node || node.kind !== 'file' || !node.data) return null;
    const asText = options?.as !== 'uint8array';
    return decodeData(node.data, asText);
  }

  async writeFile(path: string, data: string | Uint8Array): Promise<void> {
    if (this.readOnly) throw new Error('Provider is read-only');
    const parts = splitPath(path);
    if (parts.length === 0) throw new Error('Invalid path');
    const fileName = parts.pop() as string;
    const parentPath = parts.join('/');
    const parent = this.traverse(parentPath, true);
    if (!parent) throw new Error('Unable to resolve parent directory');
    const encoded = encodeData(data);
    const node: MemoryNode = {
      name: fileName,
      kind: 'file',
      children: new Map(),
      data: encoded,
      size: encoded.byteLength,
      lastModified: Date.now(),
    };
    parent.children.set(fileName, node);
  }

  async delete(path: string): Promise<void> {
    if (this.readOnly) throw new Error('Provider is read-only');
    const parts = splitPath(path);
    if (parts.length === 0) throw new Error('Invalid path');
    const fileName = parts.pop() as string;
    const parentPath = parts.join('/');
    const parent = parentPath ? this.traverse(parentPath) : this.root;
    if (!parent || parent.kind !== 'directory') throw new Error('Invalid path');
    parent.children.delete(fileName);
  }

  unmount(): void {
    this.root.children.clear();
  }
}

export default MemoryFileSystemProvider;
