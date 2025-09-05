'use client';

import { useMemo, useState } from 'react';

interface FileEntry {
  path: string;
  type: string;
  date: string; // ISO date string
}

const MOCK_FS: FileEntry[] = [
  { path: '/home/alex/Documents/report.txt', type: 'txt', date: '2024-06-01' },
  { path: '/home/alex/Documents/photo.png', type: 'png', date: '2024-05-20' },
  { path: '/home/alex/Downloads/archive.zip', type: 'zip', date: '2024-04-15' },
  { path: '/var/log/syslog', type: 'log', date: '2024-06-20' },
  { path: '/etc/hosts', type: 'conf', date: '2023-12-01' },
];

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx <= 0 ? '/' : path.slice(0, idx);
}

function filename(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
}

function ThunarView({ folder, onBack }: { folder: string; onBack: () => void }) {
  const items = useMemo(() =>
    MOCK_FS.filter(f => dirname(f.path) === folder), [folder]);
  return (
    <div className="flex flex-col h-full bg-ub-cool-grey text-white text-sm">
      <div className="p-2 bg-ub-warm-grey bg-opacity-40 flex items-center gap-2">
        <button onClick={onBack} className="px-2 py-1 bg-black bg-opacity-50 rounded">Back</button>
        <span className="font-bold">{folder}</span>
      </div>
      <ul className="flex-1 overflow-auto p-2 space-y-1">
        {items.map(it => (
          <li key={it.path}>{filename(it.path)}</li>
        ))}
        {items.length === 0 && <li>No files</li>}
      </ul>
    </div>
  );
}

export default function FileSearch() {
  const [location, setLocation] = useState('/');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [folder, setFolder] = useState<string | null>(null);

  const locations = useMemo(() =>
    ['/', ...unique(MOCK_FS.map(f => '/' + f.path.split('/')[1]).filter(Boolean))], []);
  const types = useMemo(() => unique(MOCK_FS.map(f => f.type)), []);

  const results = useMemo(() => {
    const now = new Date();
    return MOCK_FS.filter(f => {
      if (location !== '/' && !f.path.startsWith(location)) return false;
      if (query && !filename(f.path).toLowerCase().includes(query.toLowerCase())) return false;
      if (typeFilter && f.type !== typeFilter) return false;
      if (dateFilter) {
        const diff = now.getTime() - new Date(f.date).getTime();
        if (dateFilter === '7d' && diff > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '30d' && diff > 30 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === 'older' && diff <= 30 * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [location, query, typeFilter, dateFilter]);

  if (folder) {
    return <ThunarView folder={folder} onBack={() => setFolder(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-ub-cool-grey text-white text-sm">
      <div className="p-2 bg-ub-warm-grey bg-opacity-40 flex items-center gap-2">
        <select value={location} onChange={e => setLocation(e.target.value)} className="text-black p-1">
          {locations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search"
          className="flex-1 text-black p-1"
        />
      </div>
      <div className="p-2 flex flex-wrap gap-2">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? null : t)}
            className={`px-2 py-1 rounded ${typeFilter === t ? 'bg-blue-600' : 'bg-black bg-opacity-50'}`}
          >
            {t}
          </button>
        ))}
        {[{ id: '7d', label: 'Last 7 days' }, { id: '30d', label: 'Last 30 days' }, { id: 'older', label: 'Older' }].map(d => (
          <button
            key={d.id}
            onClick={() => setDateFilter(dateFilter === d.id ? null : d.id)}
            className={`px-2 py-1 rounded ${dateFilter === d.id ? 'bg-blue-600' : 'bg-black bg-opacity-50'}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <ul className="flex-1 overflow-auto p-2 space-y-1">
        {results.map(r => (
          <li key={r.path} className="flex items-center justify-between">
            <div>
              <div>{filename(r.path)}</div>
              <div className="text-xs opacity-70">{r.path}</div>
            </div>
            <button
              className="px-2 py-1 bg-black bg-opacity-50 rounded"
              onClick={() => setFolder(dirname(r.path))}
            >
              Open containing folder
            </button>
          </li>
        ))}
        {results.length === 0 && <li>No results</li>}
      </ul>
    </div>
  );
}

