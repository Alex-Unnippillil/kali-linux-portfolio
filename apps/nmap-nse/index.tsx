'use client';

import React, { useEffect, useMemo, useState } from 'react';
import share, { canShare } from '../../utils/share';

interface Script {
  name: string;
  description: string;
  example: string;
  tag: string;
}

type ScriptData = Record<string, Omit<Script, 'tag'>[]>;

/**
 * Nmap NSE playground with a script browser on the left and
 * script details/output on the right. Data is static and meant
 * purely for learning/demo purposes.
 */
const NmapNSE: React.FC = () => {
  const [data, setData] = useState<Script[]>([]);
  const [activeTag, setActiveTag] = useState('');
  const [selected, setSelected] = useState<Script | null>(null);
  const [result, setResult] = useState<{ script: string; output: string } | null>(
    null
  );

  // load static script metadata
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nmap/scripts.json');
        const json: ScriptData = await res.json();
        const flat = Object.entries(json).flatMap(([tag, scripts]) =>
          scripts.map((s) => ({ ...s, tag }))
        );
        setData(flat);
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  const tags = useMemo(() => Array.from(new Set(data.map((s) => s.tag))), [
    data,
  ]);

  const scripts = useMemo(
    () => (activeTag ? data.filter((s) => s.tag === activeTag) : data),
    [activeTag, data]
  );

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

  return (
    <div className="flex h-full min-h-screen bg-gray-900 text-white">
      {/* script browser */}
      <aside className="w-1/3 border-r border-gray-700 flex flex-col">
        <div className="sticky top-0 p-2 bg-gray-900 z-10 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              className={`px-2 py-1 rounded-full text-xs capitalize bg-gray-700 hover:bg-gray-600 ${
                activeTag === tag ? 'bg-blue-600' : ''
              }`}
              onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
            >
              {tag}
            </button>
          ))}
          <button
            className="ml-auto px-3 py-1 bg-green-700 rounded disabled:opacity-50"
            onClick={run}
            disabled={!selected}
          >
            Run
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {scripts.map((s) => (
            <button
              key={s.name}
              onClick={() => setSelected(s)}
              className={`block w-full text-left px-2 py-1 rounded font-mono text-sm hover:bg-gray-800 ${
                selected?.name === s.name ? 'bg-gray-800' : ''
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </aside>

      {/* details */}
      <main className="flex-1 p-4 overflow-y-auto">
        {selected ? (
          <div>
            <h1 className="text-2xl mb-2 font-mono">{selected.name}</h1>
            <p className="mb-4">{selected.description}</p>
            <p className="mb-2 text-sm">Tag: {selected.tag}</p>
            <h2 className="text-xl mb-2">Sample Output</h2>
            <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
              {selected.example}
            </pre>
            {result && (
              <div className="mt-4">
                <h2 className="text-xl mb-2">Result</h2>
                <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
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
              </div>
            )}
          </div>
        ) : (
          <p>Select a script to view details.</p>
        )}
      </main>
    </div>
  );
};

export default NmapNSE;

