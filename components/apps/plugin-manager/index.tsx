'use client';
import { useEffect, useState } from 'react';

interface PluginInfo {
  id: string;
  file: string;
  description?: string;
}

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [search, setSearch] = useState('');
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

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('enabledPlugins') || '{}');
      } catch {
        return {};
      }
    }
    return {};
  });

  interface LastRun {
    id: string;
    output: string[];
  }

  const [lastRun, setLastRun] = useState<LastRun | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('lastPluginRun') || 'null');
      } catch {
        return null;
      }
    }
    return null;
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
    const updatedInstalled = { ...installed, [plugin.id]: text };
    const updatedEnabled = { ...enabled, [plugin.id]: true };
    setInstalled(updatedInstalled);
    setEnabled(updatedEnabled);
    localStorage.setItem('installedPlugins', JSON.stringify(updatedInstalled));
    localStorage.setItem('enabledPlugins', JSON.stringify(updatedEnabled));
  };

  const uninstall = (plugin: PluginInfo) => {
    const { [plugin.id]: _, ...rest } = installed;
    const { [plugin.id]: __, ...restEnabled } = enabled;
    setInstalled(rest);
    setEnabled(restEnabled);
    localStorage.setItem('installedPlugins', JSON.stringify(rest));
    localStorage.setItem('enabledPlugins', JSON.stringify(restEnabled));
  };

  const toggle = (plugin: PluginInfo) => {
    const updated = { ...enabled, [plugin.id]: !enabled[plugin.id] };
    setEnabled(updated);
    localStorage.setItem('enabledPlugins', JSON.stringify(updated));
  };

  const run = (plugin: PluginInfo) => {
    const text = installed[plugin.id];
    if (!text || !enabled[plugin.id]) return;
    const result = { id: plugin.id, output: text.split(/\r?\n/) };
    setLastRun(result);
    try {
      localStorage.setItem('lastPluginRun', JSON.stringify(result));
    } catch {
      /* ignore */
    }
  };

  const exportCsv = () => {
    if (!lastRun) return;
    const csv = ['result', ...lastRun.output.map((line) => JSON.stringify(line))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lastRun.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl mb-4">Plugin Catalog</h1>
      <input
        type="text"
        placeholder="Search plugins"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 p-1 text-black"
      />
      <ul>
        {plugins
          .filter((p) => p.id.toLowerCase().includes(search.toLowerCase()))
          .map((p) => (
          <li key={p.id} className="flex items-center mb-2">
            <span className="flex-grow">{p.id}</span>
            {installed[p.id] ? (
              <>
                <button
                  className="bg-ub-red px-2 py-1 rounded ml-2"
                  onClick={() => uninstall(p)}
                >
                  Uninstall
                </button>
                <button
                  className="bg-ub-blue px-2 py-1 rounded ml-2"
                  onClick={() => toggle(p)}
                >
                  {enabled[p.id] ? 'Disable' : 'Enable'}
                </button>
                {enabled[p.id] && (
                  <button
                    className="bg-ub-green text-black px-2 py-1 rounded ml-2"
                    onClick={() => run(p)}
                  >
                    Run
                  </button>
                )}
              </>
            ) : (
              <button
                className="bg-ub-orange px-2 py-1 rounded"
                onClick={() => install(p)}
              >
                Install
              </button>
            )}
          </li>
        ))}
      </ul>
      {lastRun && (
        <div className="mt-4">
          <h2 className="text-lg mb-2">Last Run: {lastRun.id}</h2>
          <pre className="bg-black p-2 mb-2 overflow-auto text-xs">
            {lastRun.output.join('\n')}
          </pre>
          <button
            onClick={exportCsv}
            className="bg-ub-green text-black px-2 py-1 rounded"
          >
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
