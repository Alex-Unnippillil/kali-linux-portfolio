import { act, renderHook } from '@testing-library/react';
import useFileSystemNavigator from '../../hooks/useFileSystemNavigator';
import {
  fetchRecentDirectories,
  persistRecentDirectory,
} from '../../services/fileExplorer/recents';

jest.mock('../../services/fileExplorer/recents', () => ({
  fetchRecentDirectories: jest.fn(() => Promise.resolve([])),
  persistRecentDirectory: jest.fn(() => Promise.resolve()),
}));

type DirectoryEntries = Record<string, MockDirectoryHandle | MockFileHandle>;

class MockFileHandle {
  kind: 'file' = 'file';
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

class MockDirectoryHandle {
  kind: 'directory' = 'directory';
  name: string;
  private entriesMap: DirectoryEntries;

  constructor(name: string, entries: DirectoryEntries = {}) {
    this.name = name;
    this.entriesMap = entries;
  }

  async *entries(): AsyncIterableIterator<[string, MockDirectoryHandle | MockFileHandle]> {
    for (const [name, entry] of Object.entries(this.entriesMap)) {
      yield [name, entry];
    }
  }

  async getDirectoryHandle(name: string, options: { create?: boolean } = {}): Promise<MockDirectoryHandle> {
    const existing = this.entriesMap[name];
    if (existing && existing.kind === 'directory') {
      return existing as MockDirectoryHandle;
    }
    if (!existing && options.create) {
      const dir = new MockDirectoryHandle(name, {});
      this.entriesMap[name] = dir;
      return dir;
    }
    throw new Error(`Directory ${name} not found`);
  }
}

describe('useFileSystemNavigator', () => {
  const mockedFetch = jest.mocked(fetchRecentDirectories);
  const mockedPersist = jest.mocked(persistRecentDirectory);

  beforeEach(() => {
    mockedFetch.mockReset().mockResolvedValue([]);
    mockedPersist.mockReset().mockResolvedValue();
  });

  it('reads directory entries and breadcrumbs when opening a handle', async () => {
    const root = new MockDirectoryHandle('root', {
      docs: new MockDirectoryHandle('docs'),
      'readme.txt': new MockFileHandle('readme.txt'),
    });
    const { result } = renderHook(() => useFileSystemNavigator());

    await act(async () => {
      await result.current.openHandle(root, { setAsRoot: true });
    });

    expect(result.current.directories.map((d) => d.name)).toEqual(['docs']);
    expect(result.current.files.map((f) => f.name)).toEqual(['readme.txt']);
    expect(result.current.breadcrumbs.map((b) => b.name)).toEqual(['root']);
  });

  it('navigates into child directories and back out', async () => {
    const docs = new MockDirectoryHandle('docs', {
      projects: new MockDirectoryHandle('projects'),
    });
    const root = new MockDirectoryHandle('root', { docs });
    const { result } = renderHook(() => useFileSystemNavigator());

    await act(async () => {
      await result.current.openHandle(root, { setAsRoot: true });
    });

    await act(async () => {
      await result.current.enterDirectory(result.current.directories[0]);
    });

    expect(result.current.breadcrumbs.map((b) => b.name)).toEqual(['root', 'docs']);

    await act(async () => {
      await result.current.goBack();
    });

    expect(result.current.breadcrumbs.map((b) => b.name)).toEqual(['root']);
  });

  it('opens nested paths relative to the root handle', async () => {
    const home = new MockDirectoryHandle('home', {
      kali: new MockDirectoryHandle('kali'),
    });
    const root = new MockDirectoryHandle('root', { home });
    const { result } = renderHook(() => useFileSystemNavigator());

    await act(async () => {
      await result.current.openHandle(root, { setAsRoot: true });
    });

    await act(async () => {
      await result.current.openPath('~/projects');
    });

    expect(result.current.breadcrumbs.map((b) => b.name)).toEqual(['root', 'home', 'kali', 'projects']);
  });

  it('records recent directories when requested', async () => {
    const root = new MockDirectoryHandle('root');
    const { result } = renderHook(() => useFileSystemNavigator());

    await act(async () => {
      await result.current.openHandle(root, { recordRecent: true });
    });

    expect(mockedPersist).toHaveBeenCalledWith(root, 'root');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('surfaces location errors when traversal fails', async () => {
    const root = new MockDirectoryHandle('root');
    const failing = root as unknown as MockDirectoryHandle & {
      getDirectoryHandle: () => Promise<never>;
    };
    failing.getDirectoryHandle = async () => {
      throw new Error('boom');
    };

    const { result } = renderHook(() => useFileSystemNavigator());

    await act(async () => {
      await result.current.openHandle(root, { setAsRoot: true });
    });

    await act(async () => {
      await result.current.openPath('missing');
    });

    expect(result.current.locationError).toBe('Unable to open missing');
  });
});
