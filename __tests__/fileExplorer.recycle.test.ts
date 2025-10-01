import {
  persistSoftDelete,
  restoreEntry,
  purgeExpiredEntries,
  loadBinEntries,
} from '../components/apps/file-explorer/recycleBin';

const BIN_STORE = 'bin';

class FakeFile {
  private content: string;
  size: number;

  constructor(content: string) {
    this.content = content;
    this.size = new TextEncoder().encode(content).length;
  }

  async text() {
    return this.content;
  }
}

async function toStringValue(input: any): Promise<string> {
  if (typeof input === 'string') return input;
  if (input instanceof ArrayBuffer) return new TextDecoder().decode(input);
  if (ArrayBuffer.isView(input)) return new TextDecoder().decode(input);
  if (input && typeof input.text === 'function') return input.text();
  if (input instanceof Blob) return input.text();
  return String(input ?? '');
}

class FakeFileHandle {
  name: string;
  private content: string;

  constructor(name: string, initialContent: string) {
    this.name = name;
    this.content = initialContent;
  }

  async getFile() {
    return new FakeFile(this.content);
  }

  async createWritable() {
    return {
      write: async (input: any) => {
        this.content = await toStringValue(input);
      },
      close: async () => {},
    };
  }
}

class FakeDirectoryHandle {
  name: string;
  files: Map<string, FakeFileHandle> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (this.files.has(name)) return this.files.get(name)!;
    if (options.create) {
      const handle = new FakeFileHandle(name, '');
      this.files.set(name, handle);
      return handle;
    }
    throw new Error(`File ${name} not found`);
  }

  async removeEntry(name: string) {
    if (!this.files.delete(name)) {
      throw new Error(`File ${name} not found`);
    }
  }

  async requestPermission() {
    return 'granted';
  }
}

function createDb(initial: any[] = []) {
  const store = new Map(initial.map((entry) => [entry.id, entry]));
  return {
    async getAll(name: string) {
      if (name !== BIN_STORE) throw new Error('Unexpected store');
      return Array.from(store.values());
    },
    async put(name: string, value: any) {
      if (name !== BIN_STORE) throw new Error('Unexpected store');
      store.set(value.id, value);
    },
    async delete(name: string, key: string) {
      if (name !== BIN_STORE) throw new Error('Unexpected store');
      store.delete(key);
    },
  };
}

describe('recycle bin operations', () => {
  it('soft deletes files into recycle bin and records metadata', async () => {
    const directory = new FakeDirectoryHandle('root');
    const original = new FakeFileHandle('notes.txt', 'hello world');
    directory.files.set('notes.txt', original);
    const recycleDir = new FakeDirectoryHandle('bin');
    const db = createDb();

    const entry = await persistSoftDelete({
      fileEntry: { name: 'notes.txt', handle: original },
      directoryHandle: directory as any,
      recycleDir: recycleDir as any,
      dbPromise: Promise.resolve(db as any),
      pathSegments: ['root'],
      now: 1234,
      makeId: () => 'entry-1',
    });

    expect(entry).toMatchObject({
      id: 'entry-1',
      name: 'notes.txt',
      originalPath: 'root/notes.txt',
      deletedAt: 1234,
    });
    expect(entry.size).toBe((await original.getFile()).size);
    expect(directory.files.has('notes.txt')).toBe(false);
    expect(recycleDir.files.has('entry-1-notes.txt')).toBe(true);

    const stored = await loadBinEntries(Promise.resolve(db as any));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('entry-1');
  });

  it('restores soft deleted entries to original directory', async () => {
    const directory = new FakeDirectoryHandle('docs');
    const original = new FakeFileHandle('report.md', 'draft');
    directory.files.set('report.md', original);
    const recycleDir = new FakeDirectoryHandle('bin');
    const db = createDb();

    const entry = await persistSoftDelete({
      fileEntry: { name: 'report.md', handle: original },
      directoryHandle: directory as any,
      recycleDir: recycleDir as any,
      dbPromise: Promise.resolve(db as any),
      pathSegments: ['docs'],
      now: 2000,
      makeId: () => 'entry-2',
    });

    await restoreEntry(entry, { recycleDir: recycleDir as any, dbPromise: Promise.resolve(db as any) });

    const restoredHandle = await directory.getFileHandle('report.md');
    expect(await (await restoredHandle.getFile()).text()).toBe('draft');
    expect(recycleDir.files.has('entry-2-report.md')).toBe(false);
    const stored = await loadBinEntries(Promise.resolve(db as any));
    expect(stored).toHaveLength(0);
  });

  it('purges entries past retention period', async () => {
    const recycleDir = new FakeDirectoryHandle('bin');
    recycleDir.files.set('old-file', new FakeFileHandle('old-file', 'old'));
    recycleDir.files.set('recent-file', new FakeFileHandle('recent-file', 'new'));
    const oldEntry = {
      id: 'old',
      name: 'old.txt',
      binFileName: 'old-file',
      deletedAt: 0,
    };
    const recentEntry = {
      id: 'recent',
      name: 'recent.txt',
      binFileName: 'recent-file',
      deletedAt: Date.now(),
    };
    const db = createDb([oldEntry, recentEntry]);

    const { purged, remaining } = await purgeExpiredEntries({
      recycleDir: recycleDir as any,
      dbPromise: Promise.resolve(db as any),
      retentionMs: 100,
      now: 200,
    });

    expect(purged.map((entry) => entry.id)).toEqual(['old']);
    expect(remaining.map((entry) => entry.id)).toEqual(['recent']);
    expect(recycleDir.files.has('old-file')).toBe(false);
    expect(recycleDir.files.has('recent-file')).toBe(true);
  });
});
