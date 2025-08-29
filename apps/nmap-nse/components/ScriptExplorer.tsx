'use client';

import React, { useEffect, useState } from 'react';

interface NmapScript {
  name: string;
  categories: string[];
  synopsis: string;
  args: Record<string, string>;
}

const ScriptExplorer: React.FC = () => {
  const [scripts, setScripts] = useState<NmapScript[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/nmap-nse-scripts.json');
        const json = await res.json();
        setScripts(json);
      } catch (e) {
        // ignore loading errors
      }
    };
    load();
  }, []);

  const categories = Array.from(
    new Set(scripts.flatMap((s) => s.categories))
  ).sort();

  const q = query.toLowerCase();
  const filtered = scripts.filter((s) => {
    const matchesCategory = !category || s.categories.includes(category);
    const matchesQuery =
      s.name.toLowerCase().includes(q) ||
      s.synopsis.toLowerCase().includes(q) ||
      Object.keys(s.args).some((a) => a.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Nmap NSE Script Library</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search scripts"
          className="p-2 rounded text-black flex-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="p-2 rounded text-black"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {filtered.map((s) => (
        <div key={s.name} className="mb-6">
          <h2 className="text-xl font-mono mb-1">{s.name}</h2>
          <p className="mb-2">{s.synopsis}</p>
          {Object.keys(s.args).length > 0 && (
            <ul className="list-disc list-inside pl-4">
              {Object.entries(s.args).map(([arg, desc]) => (
                <li key={arg}>
                  <code className="bg-black text-green-400 px-1 py-0.5 rounded mr-1">
                    {arg}
                  </code>
                  {desc}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default ScriptExplorer;

