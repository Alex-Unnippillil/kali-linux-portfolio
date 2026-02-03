const store = new Map<number, any>();
let autoKey = 1;

const db = {
  getAll: async () => Array.from(store.values()),
  getAllKeys: async () => Array.from(store.keys()),
  put: async (_store: string, value: any) => {
    const key = autoKey;
    store.set(key, value);
    autoKey += 1;
    return key;
  },
  delete: async (_store: string, key: number) => {
    store.delete(key);
  },
};

jest.mock('../../../utils/safeIDB', () => ({
  getDb: () => Promise.resolve(db),
}));

import {
  fetchRecentDirectories,
  persistRecentDirectory,
  resetRecentsDbForTests,
} from '../../../services/fileExplorer/recents';

describe('recents storage', () => {
  beforeEach(() => {
    store.clear();
    autoKey = 1;
    resetRecentsDbForTests();
  });

  it('dedupes entries by handle identity', async () => {
    const handleA = {
      name: 'Alpha',
      kind: 'directory',
      id: 'shared',
      queryPermission: jest.fn().mockResolvedValue('granted'),
      requestPermission: jest.fn().mockResolvedValue('granted'),
      isSameEntry: jest.fn(async (other) => other?.id === 'shared'),
    } as unknown as FileSystemDirectoryHandle;
    const handleB = {
      name: 'Alpha',
      kind: 'directory',
      id: 'shared',
      queryPermission: jest.fn().mockResolvedValue('granted'),
      requestPermission: jest.fn().mockResolvedValue('granted'),
      isSameEntry: jest.fn(async (other) => other?.id === 'shared'),
    } as unknown as FileSystemDirectoryHandle;

    await persistRecentDirectory(handleA, 'Alpha');
    await persistRecentDirectory(handleB, 'Alpha');

    const recents = await fetchRecentDirectories();
    expect(recents).toHaveLength(1);
  });

  it('prunes entries that fail permission checks', async () => {
    const handle = {
      name: 'Beta',
      kind: 'directory',
      queryPermission: jest.fn().mockResolvedValue('denied'),
    } as unknown as FileSystemDirectoryHandle;

    await persistRecentDirectory(handle, 'Beta');

    const recents = await fetchRecentDirectories();
    expect(recents).toHaveLength(0);
  });
});
