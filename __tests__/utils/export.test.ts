import { describe, expect, it } from '@jest/globals';
import { DiskNode } from '@/types/disk';
import { buildDiskUsageRows, exportDiskUsage, formatBytes, toCSV } from '@/utils/export';

const sampleTree: DiskNode = {
  id: '/',
  name: 'root',
  path: [],
  parentId: null,
  type: 'directory',
  size: 3000,
  fileCount: 2,
  dirCount: 1,
  children: [
    {
      id: '/docs',
      name: 'docs',
      path: ['docs'],
      parentId: '/',
      type: 'directory',
      size: 2000,
      fileCount: 1,
      dirCount: 0,
      children: [
        {
          id: '/docs/readme.md',
          name: 'readme.md',
          path: ['docs', 'readme.md'],
          parentId: '/docs',
          type: 'file',
          size: 2000,
          fileCount: 1,
          dirCount: 0,
        },
      ],
    },
    {
      id: '/todo.txt',
      name: 'todo.txt',
      path: ['todo.txt'],
      parentId: '/',
      type: 'file',
      size: 1000,
      fileCount: 1,
      dirCount: 0,
    },
  ],
};

describe('formatBytes', () => {
  it('formats byte values using binary units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 ** 2 * 1.5, 2)).toBe('1.50 MB');
    expect(formatBytes(-1536)).toBe('-1.5 KB');
  });
});

describe('toCSV', () => {
  it('escapes delimiters and quotes', () => {
    const csv = toCSV(
      [
        { path: '/docs', name: 'Docs, Reports', note: 'He said "hello"' },
      ],
      [
        { key: 'path', label: 'Path' },
        { key: 'name', label: 'Name' },
        { key: 'note', label: 'Note' },
      ],
    );
    expect(csv).toBe('Path,Name,Note\r\n/docs,"Docs, Reports","He said ""hello"""');
  });
});

describe('buildDiskUsageRows', () => {
  it('flattens the tree with cumulative metrics', () => {
    const rows = buildDiskUsageRows(sampleTree);
    expect(rows).toHaveLength(4);
    const docs = rows.find((row) => row.path === '/docs');
    expect(docs?.size).toBe(2000);
    expect(docs?.percent).toBeCloseTo((2000 / 3000) * 100, 5);
    const rootRow = rows.find((row) => row.path === '/');
    expect(rootRow?.size).toBe(3000);
  });
});

describe('exportDiskUsage', () => {
  it('returns a BOM-prefixed CSV string without triggering download', () => {
    const csv = exportDiskUsage(sampleTree, { download: false, filename: 'test.csv' });
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('Size (bytes)');
  });
});
