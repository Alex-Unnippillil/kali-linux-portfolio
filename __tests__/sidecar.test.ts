import {
  emptySidecar,
  writeSidecar,
  readSidecar,
  deleteSidecar,
  mergeSidecarRecords,
  exportSidecars,
  importSidecars,
  applyImportResolution,
  writeSidecarAtPath,
  readSidecarAtPath,
} from '../utils/sidecar';

class MemoryWritable {
  constructor(private handle: MemoryFileHandle) {}

  async write(data: string | Blob) {
    if (typeof data === 'string') {
      this.handle.content = data;
    } else if (data instanceof Blob) {
      this.handle.content = await data.text();
    } else {
      this.handle.content = String(data);
    }
  }

  async close() {}
}

class MemoryFileHandle {
  public kind = 'file';
  public content = '';

  constructor(public name: string) {}

  async getFile() {
    const text = this.content;
    return {
      async text() {
        return text;
      },
    } as File;
  }

  async createWritable() {
    return new MemoryWritable(this);
  }
}

class MemoryDirectoryHandle {
  public kind = 'directory';
  private children = new Map<string, MemoryDirectoryHandle | MemoryFileHandle>();

  constructor(public name = '') {}

  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    const existing = this.children.get(name);
    if (existing) {
      if ((existing as any).kind !== 'file') throw new Error('Type mismatch');
      return existing as MemoryFileHandle;
    }
    if (!options.create) throw new Error('Not found');
    const file = new MemoryFileHandle(name);
    this.children.set(name, file);
    return file;
  }

  async getDirectoryHandle(name: string, options: { create?: boolean } = {}) {
    const existing = this.children.get(name);
    if (existing) {
      if ((existing as any).kind !== 'directory') throw new Error('Type mismatch');
      return existing as MemoryDirectoryHandle;
    }
    if (!options.create) throw new Error('Not found');
    const dir = new MemoryDirectoryHandle(name);
    this.children.set(name, dir);
    return dir;
  }

  async removeEntry(name: string) {
    if (!this.children.has(name)) throw new Error('Not found');
    this.children.delete(name);
  }

  async *entries(): AsyncIterableIterator<[string, MemoryDirectoryHandle | MemoryFileHandle]> {
    for (const entry of this.children.entries()) {
      yield entry;
    }
  }

  async *values(): AsyncIterableIterator<MemoryDirectoryHandle | MemoryFileHandle> {
    for (const value of this.children.values()) {
      yield value;
    }
  }
}

function asDir(handle: MemoryDirectoryHandle) {
  return handle as unknown as FileSystemDirectoryHandle;
}

describe('sidecar utilities', () => {
  it('performs CRUD operations on sidecar files', async () => {
    const root = new MemoryDirectoryHandle();
    const written = await writeSidecar(asDir(root), 'notes.txt', {
      notes: 'Initial note',
      tags: ['alpha', 'beta', 'Alpha'],
      favorite: true,
    });

    expect(written.notes).toBe('Initial note');
    expect(written.tags).toEqual(['alpha', 'beta']);
    expect(written.favorite).toBe(true);

    const read = await readSidecar(asDir(root), 'notes.txt');
    expect(read?.notes).toBe('Initial note');
    expect(read?.tags).toEqual(['alpha', 'beta']);

    const removed = await deleteSidecar(asDir(root), 'notes.txt');
    expect(removed).toBe(true);

    const missing = await readSidecar(asDir(root), 'notes.txt');
    expect(missing).toBeNull();
  });

  it('merges sidecar data and captures conflicts', () => {
    const existing = {
      ...emptySidecar(),
      notes: 'keep me',
      tags: ['existing'],
    };
    const incoming = {
      ...emptySidecar(),
      notes: 'replace me',
      tags: ['incoming'],
    };

    const unresolved = mergeSidecarRecords(existing, incoming, 'newer');
    expect(unresolved.conflicts).toHaveLength(2);
    expect(unresolved.changed).toBe(false);

    const preferIncoming = mergeSidecarRecords(existing, incoming, 'incoming');
    expect(preferIncoming.conflicts).toHaveLength(0);
    expect(preferIncoming.merged.notes).toBe('replace me');
    expect(preferIncoming.merged.tags).toEqual(['incoming']);
  });

  it('round-trips metadata through export/import with conflict resolution', async () => {
    const source = new MemoryDirectoryHandle();
    await writeSidecarAtPath(asDir(source), 'docs/report.txt', {
      notes: 'Source report',
      tags: ['export'],
      updatedAt: '2024-01-01T00:00:00.000Z',
    }, { mode: 'replace' });
    await writeSidecarAtPath(asDir(source), 'docs/plan.txt', {
      notes: 'Source plan',
    }, { mode: 'replace' });

    const payload = await exportSidecars(asDir(source));

    const target = new MemoryDirectoryHandle();
    await writeSidecarAtPath(asDir(target), 'docs/report.txt', {
      notes: 'Existing report',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }, { mode: 'replace' });
    await writeSidecarAtPath(asDir(target), 'docs/plan.txt', {
      notes: 'Local plan',
    }, { mode: 'replace' });

    const result = await importSidecars(asDir(target), payload, { strategy: 'newer' });
    expect(result.applied).toContain('docs/report.txt');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].path).toBe('docs/plan.txt');

    const afterReport = await readSidecarAtPath(asDir(target), 'docs/report.txt');
    expect(afterReport?.notes).toBe('Existing report');

    const conflict = result.conflicts[0];
    await applyImportResolution(asDir(target), conflict, 'incoming');

    const resolvedPlan = await readSidecarAtPath(asDir(target), 'docs/plan.txt');
    expect(resolvedPlan?.notes).toBe('Source plan');
  });
});

