import { applyRenames, generateRenames } from '../components/apps/file-manager/BulkRename';

describe('BulkRename helpers', () => {
  test('applies pattern and avoids collisions', () => {
    const files = [{ name: 'a.txt' }, { name: 'b.txt' }];
    const mockFs = { 'a.txt': { name: 'a.txt' }, 'b.txt': { name: 'b.txt' }, 'c.txt': { name: 'c.txt' } };
    const { updatedFs } = applyRenames(files, 'file', mockFs);
    expect(Object.keys(updatedFs).sort()).toEqual(['c.txt', 'file (1).txt', 'file.txt']);
  });

  test('marks invalid names', () => {
    const files = [{ name: 'a.txt' }];
    const renames = generateRenames(files, 'bad/name', new Set());
    expect(renames[0].valid).toBe(false);
  });
});

