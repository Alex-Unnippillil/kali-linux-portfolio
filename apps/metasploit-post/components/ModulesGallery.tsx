import React, { useMemo, useState } from 'react';
import modulesData from '../../../public/metasploit-post.json';

interface ModuleEntry {
  path: string;
  os: string;
  capability: string;
  description: string;
  tags: string[];
  options?: { name: string; label: string; value?: string }[];
  sampleOutput: string;
}

const ModulesGallery: React.FC = () => {
  const modules: ModuleEntry[] = modulesData as ModuleEntry[];
  const [search, setSearch] = useState('');
  const [os, setOs] = useState('all');
  const [capability, setCapability] = useState('all');
  const [tag, setTag] = useState('');

  const operatingSystems = useMemo(
    () => Array.from(new Set(modules.map((m) => m.os))),
    [modules]
  );
  const capabilities = useMemo(
    () => Array.from(new Set(modules.map((m) => m.capability))),
    [modules]
  );

  const filtered = modules.filter(
    (m) =>
      (os === 'all' || m.os === os) &&
      (capability === 'all' || m.capability === capability) &&
      (tag === '' || m.tags.includes(tag)) &&
      (search === '' ||
        m.path.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase()) ||
        m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="p-1 text-black rounded"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="p-1 text-black rounded"
          value={os}
          onChange={(e) => setOs(e.target.value)}
        >
          <option value="all">All OS</option>
          {operatingSystems.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          className="p-1 text-black rounded"
          value={capability}
          onChange={(e) => setCapability(e.target.value)}
        >
          <option value="all">All Capabilities</option>
          {capabilities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          className="p-1 text-black rounded"
          placeholder="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
      </div>
      <ul>
        {filtered.map((m) => (
          <li
            key={m.path}
            className="mb-4 pb-2 border-b border-gray-700 last:border-b-0"
          >
            <div className="font-mono text-sm">{m.path}</div>
            <div className="text-xs text-gray-300 mb-1">{m.description}</div>
            <div className="text-xs text-gray-400">
              OS: {m.os} | Capability: {m.capability}
            </div>
            {m.tags.length > 0 && (
              <div className="mt-1 text-xs">
                {m.tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className="mr-2 underline"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ModulesGallery;
