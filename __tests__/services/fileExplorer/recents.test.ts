import {
  fetchRecentDirectories,
  persistRecentDirectory,
  resetRecentsDbForTests,
} from '../../../services/fileExplorer/recents';

const DB_NAME = 'file-explorer';

function deleteDatabase(name: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('recents store', () => {
  beforeEach(async () => {
    await resetRecentsDbForTests();
    await deleteDatabase(DB_NAME);
  });

  it('dedupes recent entries using the fallback metadata comparison', async () => {
    const handle = { name: 'Docs' } as FileSystemDirectoryHandle;
    const duplicate = { name: 'Docs' } as FileSystemDirectoryHandle;

    await persistRecentDirectory(handle, 'Docs');
    await persistRecentDirectory(duplicate, 'Docs');

    const entries = await fetchRecentDirectories();
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Docs');
  });

  it('trims the recents list to the maximum limit', async () => {
    const handles = Array.from({ length: 12 }, (_, index) => ({
      name: `Folder ${index + 1}`,
    })) as FileSystemDirectoryHandle[];

    for (const handle of handles) {
      await persistRecentDirectory(handle, handle.name);
    }

    const entries = await fetchRecentDirectories();
    expect(entries).toHaveLength(10);
  });
});
