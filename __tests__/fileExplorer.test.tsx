import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FileExplorer from '../components/apps/file-explorer';
import useOPFS from '../hooks/useOPFS';
import { __reset as resetDb } from '../utils/safeIDB';

jest.mock('../hooks/useOPFS', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../utils/safeIDB', () => {
  const storeNames = new Set<string>();
  const stores = new Map<string, Map<string, any>>();
  const ensureStore = (name: string) => {
    if (!storeNames.has(name)) {
      storeNames.add(name);
      stores.set(name, new Map());
    }
  };

  return {
    __esModule: true,
    getDb: jest.fn(async (_name: string, _version?: number, options?: any) => {
      if (options?.upgrade) {
        options.upgrade({
          objectStoreNames: {
            contains: (storeName: string) => storeNames.has(storeName),
          },
          createObjectStore: (storeName: string) => {
            ensureStore(storeName);
            return {};
          },
        });
      }

      return {
        objectStoreNames: {
          contains: (storeName: string) => storeNames.has(storeName),
        },
        createObjectStore: (storeName: string) => {
          ensureStore(storeName);
          return {};
        },
        async getAll(storeName: string) {
          ensureStore(storeName);
          return Array.from(stores.get(storeName)!.values()).map((value) => ({ ...value }));
        },
        async put(storeName: string, value: any) {
          ensureStore(storeName);
          const store = stores.get(storeName)!;
          const record = { ...value };
          if (!record.id) {
            record.id = `${Date.now()}-${Math.random()}`;
          }
          store.set(record.id, record);
        },
        async delete(storeName: string, key: string) {
          stores.get(storeName)?.delete(key);
        },
      };
    }),
    __reset: () => {
      storeNames.clear();
      stores.clear();
    },
  };
});

const useOPFSMock = useOPFS as jest.MockedFunction<typeof useOPFS>;

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<void>;
  }
}

class FakeFileHandle {
  kind: 'file' = 'file';
  name: string;
  private content: string;

  constructor(name: string, content: string) {
    this.name = name;
    this.content = content;
  }

  setContent(content: string) {
    this.content = content;
  }

  async getFile() {
    return {
      text: async () => this.content,
    };
  }
}

class FakeDirHandle {
  kind: 'directory' = 'directory';
  name: string;
  private directories = new Map<string, FakeDirHandle>();
  private files = new Map<string, FakeFileHandle>();

  constructor(name: string) {
    this.name = name;
  }

  addFile(name: string, content: string) {
    const file = new FakeFileHandle(name, content);
    this.files.set(name, file);
    return file;
  }

  removeFile(name: string) {
    this.files.delete(name);
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    if (this.directories.has(name)) return this.directories.get(name)!;
    if (options?.create) {
      const dir = new FakeDirHandle(name);
      this.directories.set(name, dir);
      return dir;
    }
    throw new Error('Missing directory');
  }

  entries() {
    const items = [...this.directories.entries(), ...this.files.entries()];
    let index = 0;
    return {
      async next() {
        if (index >= items.length) {
          return { done: true, value: undefined };
        }
        const value = items[index++];
        return { done: false, value };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }
}

const SEARCH_INTERVAL = 4000;

describe('FileExplorer saved searches', () => {
  let originalWorker: typeof Worker | undefined;
  let originalPrompt: typeof window.prompt;

  beforeAll(() => {
    originalWorker = global.Worker;
    originalPrompt = window.prompt;
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: jest.fn(),
    });
    // Force fallback search path
    // @ts-ignore
    delete global.Worker;
  });

  afterAll(() => {
    global.Worker = originalWorker as any;
    window.prompt = originalPrompt;
  });

  let root: FakeDirHandle;
  let unsaved: FakeDirHandle;

  beforeEach(() => {
    jest.useFakeTimers();
    resetDb();
    root = new FakeDirHandle('root');
    root.addFile('alpha.txt', 'alpha match line');
    unsaved = new FakeDirHandle('unsaved');
    useOPFSMock.mockReturnValue({
      supported: true,
      root,
      getDir: jest.fn(async () => unsaved),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('refreshes saved search results when files change', async () => {
    window.prompt = jest
      .fn()
      .mockImplementationOnce(() => 'Alpha search')
      .mockImplementation(() => 'Alpha search');

    render(<FileExplorer />);

    await screen.findByText('alpha.txt');

    fireEvent.change(screen.getByPlaceholderText('Find in files'), {
      target: { value: 'match' },
    });
    const saveButton = screen.getByRole('button', { name: /Save Search/i });
    await act(async () => {
      fireEvent.click(saveButton);
      await Promise.resolve();
    });

    await screen.findAllByText('Alpha search');
    await screen.findByText(/Matches:\s*1/);
    await screen.findByText(/alpha\.txt:1/);

    root.addFile('beta.txt', 'match beta line');
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_INTERVAL);
      await Promise.resolve();
    });

    await screen.findByText(/beta\.txt:1/);
    await screen.findByText(/Matches:\s*2/);

    root.removeFile('alpha.txt');
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_INTERVAL);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText(/alpha\.txt:/)).toBeNull();
    });
    await screen.findByText(/Matches:\s*1/);
  });

  it('allows renaming and removing saved searches', async () => {
    window.prompt = jest
      .fn()
      .mockImplementationOnce(() => 'Alpha search')
      .mockImplementationOnce(() => 'Renamed search');

    render(<FileExplorer />);

    await screen.findByText('alpha.txt');
    fireEvent.change(screen.getByPlaceholderText('Find in files'), {
      target: { value: 'match' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save Search/i }));
      await Promise.resolve();
    });
    await screen.findAllByText('Alpha search');

    fireEvent.click(screen.getByText('Rename'));
    await screen.findAllByText('Renamed search');

    fireEvent.click(screen.getByText('Remove'));
    await screen.findByText('No saved searches yet');
    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });
});
