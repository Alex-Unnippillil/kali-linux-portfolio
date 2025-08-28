'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface Script {
  name: string;
  description: string;
  example: string;
}

type ScriptData = Record<string, Script[]>;

const NmapNSE: React.FC = () => {
  const [data, setData] = useState<ScriptData>({});
  const [query, setQuery] = useState('');
  const copyExample = useCallback((text: string) => {
    if (typeof window !== 'undefined') {
      try {
        navigator.clipboard?.writeText(text);
      } catch (e) {
        // ignore copy errors
      }
    }
  }, []);
  const openScriptDoc = useCallback((name: string) => {
    if (typeof window !== 'undefined') {
      window.open(
        `https://nmap.org/nsedoc/scripts/${name}.html`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nmap/scripts.json');
        const json = await res.json();
        setData(json);
      } catch (e) {
        // ignore
      }
    };
    load();
  }, []);

  const queryLower = query.toLowerCase();
  const filtered = Object.entries(data).flatMap(([category, scripts]) => {
    const categoryMatch = category.toLowerCase().includes(queryLower);
    const matchedScripts = scripts.filter((s) =>
      s.name.toLowerCase().includes(queryLower)
    );
    if (categoryMatch) {
      return [[category, scripts]];
    }
    if (matchedScripts.length > 0) {
      return [[category, matchedScripts]];
    }
    return [] as [string, Script[]][];
  });

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Nmap NSE Script Library</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter scripts"
        className="mb-4 p-2 w-full rounded text-black"
      />
      <p className="text-sm text-yellow-300 mb-4">
        Script details use static demo data for learning purposes only. Links open
        in isolated tabs.
      </p>
      {filtered.map(([category, scripts]) => (
        <div key={category} className="mb-6">
          <h2 className="text-xl mb-2 capitalize">{category}</h2>
          {scripts.map((script) => (
            <div key={script.name} className="mb-4">
              <button
                type="button"
                onClick={() => openScriptDoc(script.name)}
                className="font-mono text-blue-400 underline"
              >
                {script.name}
              </button>
              <p className="mb-2">{script.description}</p>
              <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
                {script.example}
              </pre>
              <button
                type="button"
                onClick={() => copyExample(script.example)}
                className="mt-2 px-2 py-1 bg-blue-700 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default NmapNSE;
