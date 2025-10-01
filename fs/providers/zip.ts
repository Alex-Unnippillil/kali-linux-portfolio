import { unzipSync } from 'fflate';
import { ZipProvider, VirtualEntry } from './types';

interface ZipNode {
  name: string;
  kind: 'file' | 'directory';
  children: Map<string, ZipNode>;
  data?: Uint8Array;
  size?: number;
}

function normalize(path: string): string {
  return path.replace(/\\+/g, '/').replace(/^\/+/, '');
}

function split(path: string): string[] {
  return normalize(path)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function toVirtualEntry(node: ZipNode, parentPath: string): VirtualEntry {
  const base = parentPath === '/' ? '' : parentPath;
  return {
    name: node.name,
    path: `${base}/${node.name}`.replace('//', '/'),
    kind: node.kind,
    size: node.size,
  };
}

function decode(bytes: Uint8Array, asText: boolean): string | Uint8Array {
  if (!asText) return bytes;
  return new TextDecoder().decode(bytes);
}

export class ZipFileSystemProvider implements ZipProvider {
  readonly id: string;
  readonly label: string;
  readonly readOnly = true;
  readonly sourceName: string;

  private root: ZipNode;

  private constructor(name: string, root: ZipNode) {
    this.id = `zip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.label = `${name} (archive)`;
    this.sourceName = name;
    this.root = root;
  }

  static fromBuffer(name: string, buffer: ArrayBuffer): ZipFileSystemProvider {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const entries = unzipSync(bytes, { filter: () => true });
    const root: ZipNode = {
      name: '',
      kind: 'directory',
      children: new Map(),
    };

    for (const [path, data] of Object.entries(entries)) {
      const normalized = normalize(path);
      if (!normalized) continue;
      const parts = split(normalized);
      let current = root;
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const isDirectory = normalized.endsWith('/') && isLast;
        let next = current.children.get(part);
        if (!next) {
          next = {
            name: part,
            kind: isLast && !isDirectory ? 'file' : 'directory',
            children: new Map(),
          };
          current.children.set(part, next);
        }
        if (isLast) {
          if (isDirectory) {
            next.kind = 'directory';
          } else {
            next.kind = 'file';
            next.children.clear();
            const fileBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            next.data = fileBytes;
            next.size = fileBytes.byteLength;
          }
        } else {
          if (next.kind !== 'directory') {
            next.kind = 'directory';
            next.children.clear();
          }
        }
        current = next;
      }
    }

    return new ZipFileSystemProvider(name, root);
  }

  static async fromBlob(name: string, blob: Blob): Promise<ZipFileSystemProvider> {
    const buffer = await blob.arrayBuffer();
    return ZipFileSystemProvider.fromBuffer(name, buffer);
  }

  private resolve(path: string): ZipNode | null {
    const parts = split(path);
    let current: ZipNode = this.root;
    if (parts.length === 0) return current;
    for (const part of parts) {
      const next = current.children.get(part);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  async list(path: string): Promise<VirtualEntry[]> {
    const node = this.resolve(path);
    if (!node || node.kind !== 'directory') return [];
    const entries: VirtualEntry[] = [];
    for (const child of node.children.values()) {
      entries.push(toVirtualEntry(child, path || '/'));
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  async readFile(path: string, options?: { as?: 'text' | 'uint8array' }): Promise<string | Uint8Array | null> {
    const node = this.resolve(path);
    if (!node || node.kind !== 'file' || !node.data) return null;
    const asText = options?.as !== 'uint8array';
    return decode(node.data, asText);
  }

  unmount(): void {
    this.root.children.clear();
  }
}

export default ZipFileSystemProvider;
