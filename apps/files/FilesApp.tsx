'use client';

import { useState } from 'react';

interface FileItem {
  name: string;
  size: number;
  modified: number;
  type: 'file' | 'folder';
  children?: FileItem[];
}

const sampleFiles: FileItem[] = [
  {
    name: 'Documents',
    size: 0,
    modified: Date.now() - 1000 * 60 * 60 * 24,
    type: 'folder',
    children: [
      {
        name: 'Resume.pdf',
        size: 123456,
        modified: Date.now() - 1000 * 60 * 60 * 24 * 2,
        type: 'file',
      },
    ],
  },
  {
    name: 'Pictures',
    size: 0,
    modified: Date.now() - 1000 * 60 * 60 * 5,
    type: 'folder',
    children: [],
  },
  {
    name: 'todo.txt',
    size: 1024,
    modified: Date.now() - 1000 * 60 * 10,
    type: 'file',
  },
];

const formatSize = (size: number) => {
  if (size === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = size;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(1)} ${units[i]}`;
};

const formatDate = (ms: number) => new Date(ms).toLocaleString();

type SortKey = 'name' | 'size' | 'modified';

export default function FilesApp() {
  const [path, setPath] = useState<FileItem[]>([
    { name: 'root', size: 0, modified: 0, type: 'folder', children: sampleFiles },
  ]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc',
  });

  const current = path[path.length - 1].children || [];
  const sorted = [...current].sort((a, b) => {
    let res = 0;
    if (sort.key === 'name') res = a.name.localeCompare(b.name);
    else if (sort.key === 'size') res = a.size - b.size;
    else res = a.modified - b.modified;
    return sort.dir === 'asc' ? res : -res;
  });

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  };

  const enterFolder = (item: FileItem) => {
    if (item.type === 'folder') setPath((p) => [...p, item]);
  };

  const goUp = () => {
    if (path.length > 1) setPath((p) => p.slice(0, -1));
  };

  return (
    <div className="flex h-full text-sm">
      <aside className="w-48 border-r p-2 overflow-auto">
        <div className="mb-4">
          <h2 className="font-bold mb-1">Places</h2>
          <ul className="space-y-1">
            <li
              className="cursor-pointer hover:bg-gray-200 rounded px-1"
              onDoubleClick={() => setPath((p) => [p[0]])}
            >
              Home
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold mb-1">Devices</h2>
          <ul className="space-y-1">
            <li className="px-1">File System</li>
          </ul>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-2">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="cursor-pointer" onClick={() => toggleSort('name')}>
                Name
              </th>
              <th className="cursor-pointer w-24" onClick={() => toggleSort('size')}>
                Size
              </th>
              <th className="cursor-pointer w-40" onClick={() => toggleSort('modified')}>
                Modified
              </th>
            </tr>
          </thead>
          <tbody>
            {path.length > 1 && (
              <tr
                className="hover:bg-gray-100 cursor-pointer"
                onDoubleClick={goUp}
              >
                <td colSpan={3}>..</td>
              </tr>
            )}
            {sorted.map((item) => (
              <tr
                key={item.name}
                className="hover:bg-gray-100 cursor-pointer"
                onDoubleClick={() => enterFolder(item)}
              >
                <td className="py-1">{item.name}</td>
                <td>{item.type === 'folder' ? '-' : formatSize(item.size)}</td>
                <td>{formatDate(item.modified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

