'use client';

import React, { useEffect, useMemo, useState } from 'react';
import share, { canShare } from '../../utils/share';

interface ScriptMeta {
  name: string;
  description: string;
  example: string;
}

interface ScriptWithCategory extends ScriptMeta {
  category: string;
}

type ScriptCatalog = Record<string, ScriptMeta[]>;

/**
 * Nmap NSE playground with a script browser on the left and
 * script details/output on the right. Data is static and meant
 * purely for learning/demo purposes.
 */
const NmapNSE: React.FC = () => {
  const [catalog, setCatalog] = useState<ScriptCatalog>({});
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ScriptWithCategory | null>(null);
  const [result, setResult] = useState<{ script: string; output: string } | null>(
    null
  );

  // load static script metadata
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nmap/scripts.json');
        const json: ScriptCatalog = await res.json();
        setCatalog(json);
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  const categories = useMemo(
    () =>
      Object.keys(catalog).sort((a, b) => a.localeCompare(b, undefined, {
        sensitivity: 'base',
      })),
    [catalog]
  );

  const filteredGroups = useMemo(() => {
    const query = search.toLowerCase();
    return Object.entries(catalog).reduce((acc, [category, scripts]) => {
      if (activeCategory && category !== activeCategory) {
        return acc;
      }
      const filtered = scripts.filter((script) =>
        script.name.toLowerCase().includes(query)
      );
      if (filtered.length) {
        acc[category] = filtered;
      }
      return acc;
    }, {} as Record<string, ScriptMeta[]>);
  }, [activeCategory, catalog, search]);

  const flatFilteredScripts = useMemo(
    () =>
      Object.entries(filteredGroups).flatMap(([category, scripts]) =>
        scripts.map<ScriptWithCategory>((script) => ({
          ...script,
          category,
        }))
      ),
    [filteredGroups]
  );

  useEffect(() => {
    if (!selected) return;
    const stillVisible = flatFilteredScripts.some(
      (script) =>
        script.name === selected.name && script.category === selected.category
    );
    if (!stillVisible) {
      setSelected(null);
    }
  }, [flatFilteredScripts, selected]);

  const run = () => {
    if (!selected) return;
    setResult({ script: selected.name, output: selected.example });
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.script}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareResult = () => {
    if (!result) return;
    share(JSON.stringify(result, null, 2), 'Nmap NSE Result');
  };

  const severityColor = (category: string) => {
    switch (category) {
      case 'vuln':
        return 'border-red-500';
      case 'safe':
        return 'border-green-500';
      default:
        return 'border-blue-500';
    }
  };

  const CollapsibleSection: React.FC<{
    title: string;
    tag?: string;
    children: React.ReactNode;
  }> = ({ title, tag, children }) => {
    const [open, setOpen] = useState(true);
    return (
      <div className={`mb-4 border-l-4 ${severityColor(tag || '')}`}>
        <button
          className="w-full flex justify-between items-center bg-gray-800 px-2 py-1.5"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span>{title}</span>
          <span className="text-xl leading-none">{open ? '−' : '+'}</span>
        </button>
        {open && <div className="p-1.5">{children}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-900 text-white">
      <header className="flex items-center gap-2 p-2 bg-gray-800">
        <img
          src="/themes/Yaru/apps/radar-symbolic.svg"
          alt="Radar"
          className="w-5 h-5"
        />
        <h1 className="font-mono">Nmap NSE</h1>
      </header>
      <div className="flex flex-1">
        {/* script browser */}
        <aside className="w-1/3 border-r border-gray-700 flex flex-col">
          <div className="sticky top-0 p-2 bg-gray-900 z-10 flex flex-wrap items-center gap-2">
            {categories.map((category) => {
              const count = catalog[category]?.length ?? 0;
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  className={`h-6 px-2 rounded-full text-xs capitalize bg-gray-700 hover:bg-gray-600 flex items-center ${
                    active ? 'bg-blue-600' : ''
                  }`}
                  onClick={() =>
                    setActiveCategory(active ? '' : category)
                  }
                  type="button"
                  aria-pressed={active}
                  aria-label={`Filter by ${category} (${count})`}
                >
                  {category} ({count})
                </button>
              );
            })}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-6 px-2 rounded text-black font-mono flex-1"
            />
            <button
              className="ml-auto px-3 py-1 bg-green-700 rounded disabled:opacity-50"
              onClick={run}
              disabled={!selected}
            >
              Run
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-4">
            {Object.entries(filteredGroups).map(([category, scripts]) => (
              <section key={category} aria-label={`${category} scripts`}>
                <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-1">
                  {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scripts.map((script) => {
                    const isActive =
                      selected?.name === script.name &&
                      selected.category === category;
                    return (
                      <button
                        key={script.name}
                        onClick={() =>
                          setSelected({ ...script, category })
                        }
                        className={`w-full text-left px-2 py-1 rounded font-mono text-sm hover:bg-gray-800 ${
                          isActive ? 'bg-gray-800' : 'bg-gray-700'
                        }`}
                        type="button"
                      >
                        {script.name}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            {flatFilteredScripts.length === 0 && (
              <p className="text-sm text-gray-300">No scripts found.</p>
            )}
          </div>
          {selected && (
            <div
              className={`m-2 mt-0 p-3 rounded border-l-4 ${
                severityColor(selected.category)
              } bg-gray-800`}
              data-testid="script-help-panel"
            >
              <h2 className="font-mono text-lg mb-1">{selected.name}</h2>
              <p className="text-sm mb-2 text-gray-200">{selected.description}</p>
              <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                Sample output
              </h3>
              <pre className="bg-black text-green-400 rounded p-2 overflow-auto font-mono leading-[1.2]">
                {selected.example}
              </pre>
            </div>
          )}
        </aside>

        {/* details */}
        <main className="flex-1 p-4 overflow-y-auto">
          {selected ? (
            <div>
              <h1 className="text-2xl mb-2 font-mono">{selected.name}</h1>
              <p className="mb-4">{selected.description}</p>
              <p className="mb-2 text-sm">Category: {selected.category}</p>
              <CollapsibleSection title="Sample Output" tag={selected.category}>
                <pre className="bg-black text-green-400 rounded overflow-auto font-mono leading-[1.2]">
                  {selected.example}
                </pre>
              </CollapsibleSection>
              {result && (
                <CollapsibleSection title="Result" tag={selected.category}>
                  <pre className="bg-black text-green-400 rounded overflow-auto font-mono leading-[1.2]">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="px-2 py-1 bg-blue-700 rounded"
                      onClick={download}
                      type="button"
                    >
                      Download JSON
                    </button>
                    {canShare() && (
                      <button
                        className="px-2 py-1 bg-purple-700 rounded"
                        onClick={shareResult}
                        type="button"
                      >
                        Share
                      </button>
                    )}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          ) : (
            <p>Select a script to view details.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default NmapNSE;

