import { ZipFileSystemProvider } from '../fs/providers/zip';
import { MountManager } from '../fs/providers/mount-manager';
import { MemoryFileSystemProvider } from '../fs/providers/memory';

const SAMPLE_ZIP_BASE64 =
  'UEsDBBQAAAAAAEk2QVuFEUoNCwAAAAsAAAAPAAAAZm9sZGVyL2ZpbGUudHh0aGVsbG8gd29ybGRQSwMEFAAAAAAASTZBW2ocSUsJAAAACQAAABQAAABmb2xkZXIvaW5uZXIvaW5mby5tZCMgZGV0YWlsc1BLAwQUAAAAAABJNkFbsQtk2AoAAAAKAAAACAAAAHJvb3QudHh0cm9vdCBsZXZlbFBLAQIUAxQAAAAAAEk2QVuFEUoNCwAAAAsAAAAPAAAAAAAAAAAAAACAAQAAAABmb2xkZXIvZmlsZS50eHRQSwECFAMUAAAAAABJNkFbahxJSwkAAAAJAAAAFAAAAAAAAAAAAAAAgAE4AAAAZm9sZGVyL2lubmVyL2luZm8ubWRQSwECFAMUAAAAAABJNkFbsQtk2AoAAAAKAAAACAAAAAAAAAAAAAAAgAFzAAAAcm9vdC50eHRQSwUGAAAAAAMAAwC1AAAAowAAAAAA';

const readAll = async (provider: ZipFileSystemProvider, path: string) => {
  const entries = await provider.list(path);
  return entries.map((entry) => ({ name: entry.name, kind: entry.kind, path: entry.path }));
};

describe('ZipFileSystemProvider', () => {
  it('allows navigation through nested directories', async () => {
    const archive = Uint8Array.from(Buffer.from(SAMPLE_ZIP_BASE64, 'base64'));
    const provider = ZipFileSystemProvider.fromBuffer('test.zip', archive);

    const rawRootEntries = await provider.list('/');
    const rootEntries = rawRootEntries.map((entry) => ({
      name: entry.name,
      kind: entry.kind,
      path: entry.path,
    }));
    expect(rootEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'folder', kind: 'directory', path: '/folder' }),
        expect.objectContaining({ name: 'root.txt', kind: 'file', path: '/root.txt' }),
      ]),
    );

    const folderEntries = await readAll(provider, '/folder');
    expect(folderEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'file.txt', kind: 'file', path: '/folder/file.txt' }),
        expect.objectContaining({ name: 'inner', kind: 'directory', path: '/folder/inner' }),
      ]),
    );

    const nestedEntries = await readAll(provider, '/folder/inner');
    expect(nestedEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'info.md', kind: 'file', path: '/folder/inner/info.md' }),
      ]),
    );

    const fileContents = await provider.readFile('/folder/inner/info.md', { as: 'text' });
    expect(fileContents).toBe('# details');
  });
});

describe('MountManager', () => {
  it('removes providers on unmount and calls cleanup', () => {
    const manager = new MountManager();
    const provider = new MemoryFileSystemProvider({ label: 'Temp', files: { '/note.txt': 'memo' } });
    const unmountSpy = jest.spyOn(provider, 'unmount');

    manager.mount(provider);
    expect(manager.list()).toHaveLength(1);

    manager.unmount(provider.id);
    expect(manager.list()).toHaveLength(0);
    expect(manager.get(provider.id)).toBeUndefined();
    expect(unmountSpy).toHaveBeenCalled();
  });
});
