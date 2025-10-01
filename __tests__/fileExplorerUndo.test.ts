import { RecycleBinUndoManager, restoreDeletion } from '../modules/fileExplorer/undoManager';

const toBuffer = (text: string) => new TextEncoder().encode(text).buffer;

describe('RecycleBinUndoManager', () => {
  it('restores files through the provided restorer', async () => {
    const manager = new RecycleBinUndoManager();
    const operation = {
      files: [
        {
          name: 'file.txt',
          segments: ['folder', 'file.txt'],
          path: 'folder/file.txt',
          data: toBuffer('payload'),
          recycleName: 'file.txt.restore',
        },
      ],
      groupSnapshot: {
        id: 'hash-1',
        hash: 'hash-1',
        size: 7,
        files: [
          { path: 'folder/file.txt', segments: ['folder', 'file.txt'], name: 'file.txt', size: 7, type: '' },
        ],
      },
    };

    manager.push(operation);
    const popped = manager.pop();
    expect(popped).toBeTruthy();

    const restoredFiles = new Map<string, number>();
    const restored = await restoreDeletion(popped!, async (entry) => {
      restoredFiles.set(entry.path || entry.segments.join('/'), new Uint8Array(entry.data).length);
    });

    expect(restored).toBe(true);
    expect(restoredFiles.get('folder/file.txt')).toBe(7);
  });
});
