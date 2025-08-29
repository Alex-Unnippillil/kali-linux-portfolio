'use client';
import { useEffect, useState } from 'react';

interface PluginInfo { id: string; file: string; }

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [installed, setInstalled] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('installedPlugins') || '{}');
      } catch {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    fetch('/api/plugins')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  const install = async (plugin: PluginInfo) => {
    const res = await fetch(`/api/plugins/${plugin.file}`);
    const text = await res.text();
    const updated = { ...installed, [plugin.id]: text };
    setInstalled(updated);
    localStorage.setItem('installedPlugins', JSON.stringify(updated));
  };

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl mb-4">Plugin Catalog</h1>
      <ul>
        {plugins.map((p) => (
          <li key={p.id} className="flex items-center mb-2">
            <span className="flex-grow">{p.id}</span>
            <button
              className="bg-ub-orange px-2 py-1 rounded disabled:opacity-50"
              onClick={() => install(p)}
              disabled={installed[p.id] !== undefined}
            >
              {installed[p.id] ? 'Installed' : 'Install'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
