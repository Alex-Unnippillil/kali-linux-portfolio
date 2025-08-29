'use client';

import React, { useEffect, useState } from 'react';

interface FormatEntry {
  format: string;
  example: string;
  salt: string | null;
}

const FormatZoo: React.FC = () => {
  const [formats, setFormats] = useState<FormatEntry[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/john-formats.json')
      .then((res) => res.json())
      .then(setFormats)
      .catch(() => setFormats([]));
  }, []);

  const filtered = formats.filter((f) =>
    f.format.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mt-4">
      <h2 className="text-lg mb-2">Format Zoo</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search format"
        className="mb-2 px-2 py-1 rounded text-black"
      />
      <ul className="space-y-2 max-h-64 overflow-auto">
        {filtered.map((f) => (
          <li key={f.format} className="bg-black p-2 rounded">
            <p className="font-semibold">{f.format}</p>
            <p className="text-sm text-gray-400">Salt: {f.salt || 'None'}</p>
            <p className="font-mono text-xs break-all">{f.example}</p>
          </li>
        ))}
        {filtered.length === 0 && <li>No formats found</li>}
      </ul>
    </div>
  );
};

export default FormatZoo;
