import { renameEntryHandle, serializeEntry, restoreSerializedEntry } from '../components/apps/file-explorer';

describe('file explorer helpers', () => {
  class MockWritable {
    private handle: MockFileHandle;

    constructor(handle: MockFileHandle) {
      this.handle = handle;
    }

    async write(data: Uint8Array | string | MockFile): Promise<void> {
      if (data instanceof MockFile) {
        const buffer = await data.arrayBuffer();
        this.handle.data = new Uint8Array(buffer);
        return;
      }
      if (typeof data === 'string') {
        this.handle.data = new TextEncoder().encode(data);
        return;
      }
      this.handle.data = new Uint8Array(data);
    }

    async close(): Promise<void> {
      // no-op
    }
  }

  class MockFile {
    private buffer: Uint8Array;
    readonly name: string;

    constructor(data: Uint8Array | string = new Uint8Array(), name = '') {
      this.buffer = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
      this.name = name;
    }

    async text(): Promise<string> {
      return new TextDecoder().decode(this.buffer);
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      return this.buffer.slice().buffer;
    }
  }

  class MockFileHandle {
    readonly kind = 'file';
    name: string;
    data: Uint8Array;

    constructor(name: string, data: Uint8Array | string = new Uint8Array()) {
      this.name = name;
      this.data = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    }

    async getFile(): Promise<MockFile> {
      return new MockFile(this.data, this.name);
    }

    async createWritable(): Promise<MockWritable> {
      return new MockWritable(this);
    }
  }

  class MockDirectoryHandle {
    readonly kind = 'directory';
    name: string;
    private entriesMap: Map<string, MockFileHandle | MockDirectoryHandle> = new Map();

    constructor(name: string) {
      this.name = name;
    }

    async getFileHandle(name: string, options: { create?: boolean } = {}): Promise<MockFileHandle> {
      const entry = this.entriesMap.get(name);
      if (entry) {
        if (entry.kind !== 'file') throw new Error(`${name} is not a file`);
        return entry;
      }
      if (options.create) {
        const file = new MockFileHandle(name);
        this.entriesMap.set(name, file);
        return file;
      }
      throw new Error(`File ${name} not found`);
    }

    async getDirectoryHandle(name: string, options: { create?: boolean } = {}): Promise<MockDirectoryHandle> {
      const entry = this.entriesMap.get(name);
      if (entry) {
        if (entry.kind !== 'directory') throw new Error(`${name} is not a directory`);
        return entry;
      }
      if (options.create) {
        const dir = new MockDirectoryHandle(name);
        this.entriesMap.set(name, dir);
        return dir;
      }
      throw new Error(`Directory ${name} not found`);
    }

    async removeEntry(name: string, options: { recursive?: boolean } = {}): Promise<void> {
      const entry = this.entriesMap.get(name);
      if (!entry) throw new Error(`Entry ${name} not found`);
      if (entry.kind === 'directory' && entry.entriesMap.size > 0 && !options.recursive) {
        throw new Error('Directory not empty');
      }
      this.entriesMap.delete(name);
    }

    async *entries(): AsyncGenerator<[string, MockFileHandle | MockDirectoryHandle]> {
      for (const [name, handle] of this.entriesMap.entries()) {
        yield [name, handle];
      }
    }
  }

  const setupDir = async () => {
    const root = new MockDirectoryHandle('root');
    const docs = await root.getDirectoryHandle('docs', { create: true });
    const note = await docs.getFileHandle('notes.txt', { create: true });
    note.data = new TextEncoder().encode('classified');
    return { root, docs, note };
  };

  it('renames file handles while preserving contents', async () => {
    const { root } = await setupDir();
    const file = await root.getFileHandle('readme.txt', { create: true });
    file.data = new TextEncoder().encode('hello world');
    const entry = { name: 'readme.txt', handle: file } as const;

    const renamed = await renameEntryHandle(root as any, entry as any, 'notes.txt');

    await expect(root.getFileHandle('readme.txt')).rejects.toThrow('File readme.txt not found');
    const newFile = await root.getFileHandle('notes.txt');
    const contents = await newFile.getFile();
    expect(await contents.text()).toBe('hello world');
    expect((renamed as MockFileHandle).name).toBe('notes.txt');
  });

  it('renames directories recursively', async () => {
    const { root, docs } = await setupDir();
    const entry = { name: 'docs', handle: docs } as const;

    const renamed = await renameEntryHandle(root as any, entry as any, 'archive');

    await expect(root.getDirectoryHandle('docs')).rejects.toThrow('Directory docs not found');
    const archive = await root.getDirectoryHandle('archive');
    const restoredNote = await archive.getFileHandle('notes.txt');
    const file = await restoredNote.getFile();
    expect(await file.text()).toBe('classified');
    expect((renamed as MockDirectoryHandle).name).toBe('archive');
  });

  it('serializes and restores entries for undo', async () => {
    const { root, docs } = await setupDir();
    const docEntry = { name: 'docs', handle: docs } as const;
    const snapshot = await serializeEntry(docEntry as any);

    await root.removeEntry('docs', { recursive: true });
    await expect(root.getDirectoryHandle('docs')).rejects.toThrow('Directory docs not found');

    await restoreSerializedEntry(snapshot as any, root as any);
    const restored = await root.getDirectoryHandle('docs');
    const restoredFile = await restored.getFileHandle('notes.txt');
    const contents = await restoredFile.getFile();
    expect(await contents.text()).toBe('classified');
    expect(snapshot).toMatchObject({ type: 'directory', name: 'docs' });
  });
});

