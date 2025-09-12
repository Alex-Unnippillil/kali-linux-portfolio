'use client';

import { useMemo, useState } from 'react';

interface AppInfo {
  id: string;
  name: string;
  category: string;
}

const APPS: AppInfo[] = [
  { id: 'nmap', name: 'Nmap', category: 'Security' },
  { id: 'wireshark', name: 'Wireshark', category: 'Security' },
  { id: 'firefox', name: 'Firefox', category: 'Utility' },
  { id: 'vim', name: 'Vim', category: 'Productivity' },
  { id: 'gimp', name: 'GIMP', category: 'Graphics' },
];

export default function SoftwareCenter() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [installed, setInstalled] = useState<Record<string, boolean>>({});

  const categories = useMemo(
    () => Array.from(new Set(APPS.map((a) => a.category))),
    []
  );

  const toggle = (id: string) => {
    setInstalled((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = APPS.filter(
    (app) =>
      app.name.toLowerCase().includes(query.toLowerCase()) &&
      (!category || app.category === category)
  );

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl mb-4">Software Center</h1>
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search applications"
          className="px-2 py-1 rounded text-black flex-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="px-2 py-1 rounded text-black"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((app) => (
          <div
            key={app.id}
            className="bg-gray-700 rounded p-4 flex flex-col items-start"
          >
            <h2 className="text-lg mb-1">{app.name}</h2>
            <span className="text-sm mb-2 text-gray-300">{app.category}</span>
            <button
              onClick={() => toggle(app.id)}
              className={`px-2 py-1 rounded text-white ${
                installed[app.id]
                  ? 'bg-red-700 hover:bg-red-600'
                  : 'bg-blue-700 hover:bg-blue-600'
              }`}
            >
              {installed[app.id] ? 'Remove' : 'Install'}
            </button>
          </div>
        ))}
        {!filtered.length && <p>No applications found.</p>}
      </div>
    </div>
  );
}

