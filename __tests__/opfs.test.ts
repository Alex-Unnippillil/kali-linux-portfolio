import { saveToOPFS, readFromOPFS } from '../lib/opfs';

type DirectoryNode = {
  kind: 'directory';
  entries: Map<string, DirectoryNode | FileNode>;
};

type FileNode = {
  kind: 'file';
  data: string;
};

type OPFSStorageMock = {
  root: DirectoryNode;
  storageManager: StorageManager & {
    getDirectory: () => Promise<FileSystemDirectoryHandle>;
  };
};

function createDirectoryNode(): DirectoryNode {
  return { kind: 'directory', entries: new Map() };
}

function createFileNode(initialData = ''): FileNode {
  return { kind: 'file', data: initialData };
}

function createWritableStream(node: FileNode): FileSystemWritableFileStream {
  return {
    async write(chunk: unknown) {
      if (typeof chunk === 'string') {
        node.data = chunk;
      } else if (chunk instanceof Blob) {
        node.data = await chunk.text();
      } else if (chunk instanceof ArrayBuffer) {
        node.data = new TextDecoder().decode(chunk);
      } else if (ArrayBuffer.isView(chunk)) {
        const view = chunk as ArrayBufferView;
        const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
        node.data = new TextDecoder().decode(buffer);
      } else if (chunk) {
        node.data = String(chunk);
      } else {
        node.data = '';
      }
    },
    async close() {
      return;
    },
  } as FileSystemWritableFileStream;
}

function createFileHandle(node: FileNode): FileSystemFileHandle {
  return {
    kind: 'file',
    async getFile() {
      return {
        async text() {
          return node.data;
        },
      } as File;
    },
    async createWritable() {
      return createWritableStream(node);
    },
  } as FileSystemFileHandle;
}

function createDirectoryHandle(node: DirectoryNode): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    async getDirectoryHandle(name: string, options: any = {}) {
      const { create = false } = options;
      const existing = node.entries.get(name);
      if (existing) {
        if (existing.kind !== 'directory') {
          throw new TypeError(`Entry "${name}" is not a directory.`);
        }
        return createDirectoryHandle(existing);
      }
      if (!create) {
        throw new Error(`Directory "${name}" does not exist.`);
      }
      const child = createDirectoryNode();
      node.entries.set(name, child);
      return createDirectoryHandle(child);
    },
    async getFileHandle(name: string, options: any = {}) {
      const { create = false } = options;
      const existing = node.entries.get(name);
      if (existing) {
        if (existing.kind !== 'file') {
          throw new TypeError(`Entry "${name}" is not a file.`);
        }
        return createFileHandle(existing);
      }
      if (!create) {
        throw new Error(`File "${name}" does not exist.`);
      }
      const fileNode = createFileNode();
      node.entries.set(name, fileNode);
      return createFileHandle(fileNode);
    },
    async removeEntry(name: string) {
      node.entries.delete(name);
    },
    async *values() {
      for (const entry of node.entries.values()) {
        if (entry.kind === 'file') {
          yield createFileHandle(entry);
        }
      }
    },
  } as FileSystemDirectoryHandle;
}

function createOPFSStorage(existingRoot?: DirectoryNode): OPFSStorageMock {
  const root = existingRoot ?? createDirectoryNode();
  const baseStorage = ((navigator as any).storage ?? {}) as Record<string, unknown>;
  return {
    root,
    storageManager: {
      ...baseStorage,
      async getDirectory() {
        return createDirectoryHandle(root);
      },
    } as StorageManager & {
      getDirectory: () => Promise<FileSystemDirectoryHandle>;
    },
  };
}

function setNavigatorStorage(storage: OPFSStorageMock) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: storage.storageManager,
  });
}

async function readFileFromNavigator(path: string): Promise<string> {
  const root = await (navigator.storage as any).getDirectory();
  const segments = path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) {
    throw new Error('Invalid file path');
  }

  let currentDir = root as FileSystemDirectoryHandle;
  for (const segment of segments) {
    currentDir = await currentDir.getDirectoryHandle(segment, { create: false });
  }
  const fileHandle = await currentDir.getFileHandle(fileName, { create: false });
  const file = await fileHandle.getFile();
  return file.text();
}

describe('saveToOPFS', () => {
  let root: DirectoryNode;
  let originalStorage: StorageManager | undefined;
  let hadStorage: boolean;

  beforeEach(() => {
    hadStorage = 'storage' in navigator;
    originalStorage = (navigator as any).storage;
    const storage = createOPFSStorage();
    root = storage.root;
    setNavigatorStorage(storage);
  });

  afterEach(() => {
    if (hadStorage) {
      Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: originalStorage,
      });
    } else {
      delete (navigator as any).storage;
    }
  });

  it('saves text and retrieves it across reloads', async () => {
    await saveToOPFS('documents/notes/persist.txt', 'OPFS survives reloads');

    const reloadedStorage = createOPFSStorage(root);
    setNavigatorStorage(reloadedStorage);

    await expect(readFileFromNavigator('documents/notes/persist.txt')).resolves.toBe(
      'OPFS survives reloads',
    );

    await expect(readFromOPFS('documents/notes/persist.txt')).resolves.toBe(
      'OPFS survives reloads',
    );
  });
});
