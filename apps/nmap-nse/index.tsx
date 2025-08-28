'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface Script {
  name: string;
  description: string;
  example: string;
}

type ScriptData = Record<string, Script[]>;

const NmapNSE: React.FC = () => {
  const [data, setData] = useState<ScriptData>({});
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
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
    const handler = setTimeout(() => setDebouncedFilter(filter), 300);
    return () => clearTimeout(handler);
  }, [filter]);

  const filteredEntries = useMemo(() => {
    if (!debouncedFilter) return Object.entries(data);
    const lower = debouncedFilter.toLowerCase();
    return Object.entries(data)
      .map(([category, scripts]) => [
        category,
        scripts.filter((script) =>
          [script.name, script.description, script.example].some((field) =>
            field.toLowerCase().includes(lower)
          )
        ),
      ])
      .filter(([, scripts]) => scripts.length > 0);
  }, [data, debouncedFilter]);

  const escapeRegExp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightMatch = (text: string) => {
    if (!debouncedFilter) return text;
    const regex = new RegExp(`(${escapeRegExp(debouncedFilter)})`, 'ig');
    return text.split(regex).map((part, i) =>
      part.toLowerCase() === debouncedFilter.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500 text-black">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

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

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Nmap NSE Script Library</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Script details use static demo data for learning purposes only. Links open
        in isolated tabs.
      </p>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter scripts..."
        className="mb-4 w-full p-2 rounded text-black"
        aria-label="Filter scripts"
      />
      {filteredEntries.map(([category, scripts]) => (
        <div key={category} className="mb-6">
          <h2 className="text-xl mb-2 capitalize">{category}</h2>
          {scripts.map((script) => (
            <div key={script.name} className="mb-4">
              <button
                type="button"
                onClick={() => openScriptDoc(script.name)}
                className="font-mono text-blue-400 underline"
              >
                {highlightMatch(script.name)}
              </button>
              <p className="mb-2">{highlightMatch(script.description)}</p>
              <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
                {highlightMatch(script.example)}
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
