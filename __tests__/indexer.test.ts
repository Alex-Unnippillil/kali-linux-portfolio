import { createDirectoryIndexer } from '../utils/indexer';

class MockFileHandle {
  kind: 'file' = 'file';
  name: string;
  private contentProvider: () => string;

  constructor(name: string, content: string | (() => string)) {
    this.name = name;
    this.contentProvider = typeof content === 'function' ? (content as () => string) : () => content;
  }

  setContent(content: string) {
    this.contentProvider = () => content;
  }

  async getFile(): Promise<File> {
    const content = this.contentProvider();
    return {
      name: this.name,
      type: 'text/plain',
      size: content.length,
      lastModified: Date.now(),
      async text() {
        return content;
      },
    } as unknown as File;
  }

  async createWritable() {
    throw new Error('Not implemented');
  }
}

class MockDirectoryHandle {
  kind: 'directory' = 'directory';
  name: string;
  private entriesMap: Map<string, MockDirectoryHandle | MockFileHandle> = new Map();

  constructor(name: string, entries: Record<string, MockDirectoryHandle | MockFileHandle>) {
    this.name = name;
    Object.entries(entries).forEach(([key, value]) => {
      this.entriesMap.set(key, value);
    });
  }

  addEntry(name: string, entry: MockDirectoryHandle | MockFileHandle) {
    this.entriesMap.set(name, entry);
  }

  async *entries(): AsyncIterableIterator<[string, MockDirectoryHandle | MockFileHandle]> {
    for (const [key, value] of this.entriesMap.entries()) {
      yield [key, value];
    }
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    if (!this.entriesMap.has(name) && options?.create) {
      const dir = new MockDirectoryHandle(name, {});
      this.entriesMap.set(name, dir);
      return dir;
    }
    const entry = this.entriesMap.get(name);
    if (entry && entry.kind === 'directory') {
      return entry as MockDirectoryHandle;
    }
    throw new Error(`Directory ${name} not found`);
  }

  async removeEntry(name: string) {
    this.entriesMap.delete(name);
  }

  async resolve() {
    return [];
  }

  async queryPermission() {
    return 'granted';
  }

  async requestPermission() {
    return 'granted';
  }
}

async function waitForSnapshot(
  getter: () => { status: string },
  predicate: (snapshot: { status: string }) => boolean,
  timeout = 2000
) {
  const start = Date.now();
  while (!predicate(getter())) {
    if (Date.now() - start > timeout) {
      throw new Error('Timed out waiting for snapshot');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('createDirectoryIndexer (inline)', () => {
  test('indexes directory tree and finds search hits', async () => {
    const root = new MockDirectoryHandle('root', {
      'alpha.txt': new MockFileHandle('alpha.txt', 'alpha bravo charlie\nneedle in haystack'),
      nested: new MockDirectoryHandle('nested', {
        'beta.txt': new MockFileHandle('beta.txt', 'beta content\nsearch target appears here'),
      }),
    });

    const indexer = createDirectoryIndexer({ useWorker: false, engineOptions: { throttleMs: 0 } });
    const events: string[] = [];
    const unsubscribe = indexer.subscribe((event) => events.push(event.type));
    indexer.start(root as unknown as FileSystemDirectoryHandle);

    await waitForSnapshot(() => indexer.getSnapshot(), (snapshot) => snapshot.status === 'completed');
    const snapshot = indexer.getSnapshot();
    expect(snapshot.lastError).toBeUndefined();
    expect(snapshot.filesProcessed).toBeGreaterThan(0);
    expect(events).toContain('progress');
    unsubscribe();

    const hits = await indexer.search('search');
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe('nested/beta.txt');
    indexer.destroy();
  });

  test('updates index when file content changes', async () => {
    const dynamicFile = new MockFileHandle('gamma.txt', 'original text');
    const root = new MockDirectoryHandle('root', {
      'gamma.txt': dynamicFile,
    });

    const indexer = createDirectoryIndexer({ useWorker: false, engineOptions: { throttleMs: 0 } });
    const events: string[] = [];
    const unsubscribe = indexer.subscribe((event) => events.push(event.type));
    indexer.start(root as unknown as FileSystemDirectoryHandle);
    await waitForSnapshot(() => indexer.getSnapshot(), (snapshot) => snapshot.status === 'completed');
    expect(indexer.getSnapshot().lastError).toBeUndefined();
    expect(indexer.getSnapshot().filesProcessed).toBe(1);
    expect(events).toContain('progress');
    unsubscribe();

    let hits = await indexer.search('updated');
    expect(hits).toHaveLength(0);

    dynamicFile.setContent('updated content now available');
    await indexer.updateFile('gamma.txt', dynamicFile as unknown as FileSystemFileHandle);

    hits = await indexer.search('updated');
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe('gamma.txt');
    indexer.destroy();
  });

  test('cancels an in-progress indexing job', async () => {
    const entries: Record<string, MockFileHandle> = {};
    for (let i = 0; i < 100; i += 1) {
      entries[`file-${i}.txt`] = new MockFileHandle(`file-${i}.txt`, `content ${i}`);
    }
    const root = new MockDirectoryHandle('root', entries);

    const indexer = createDirectoryIndexer({ useWorker: false, engineOptions: { throttleMs: 5 } });
    indexer.start(root as unknown as FileSystemDirectoryHandle);

    await new Promise((resolve) => setTimeout(resolve, 20));
    indexer.cancel();

    await waitForSnapshot(() => indexer.getSnapshot(), (snapshot) => snapshot.status === 'cancelled');
    const snapshot = indexer.getSnapshot();
    expect(snapshot.status).toBe('cancelled');
    indexer.destroy();
  });
});

