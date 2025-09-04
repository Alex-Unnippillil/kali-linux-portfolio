"use client";

import React from "react";
import usePersistentState from "../../../hooks/usePersistentState";

interface ScriptMeta {
  name: string;
  description: string;
  categories: string;
  code: string;
}

const OUTPUT_EXAMPLES: Record<string, string> = {
  'http-title': `80/tcp open  http
| http-title: Example Domain
|_Requested resource was Example Domain page`,
  'ftp-anon': `21/tcp open  ftp
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_This is a sample output`,
};

const PRESET_CATEGORIES = [
  "auth",
  "brute",
  "broadcast",
  "default",
  "discovery",
  "dos",
  "exploit",
  "external",
  "fuzzer",
  "intrusive",
  "malware",
  "safe",
  "version",
  "vuln",
];

const SAMPLE_SCRIPTS: ScriptMeta[] = [
  {
    name: "http-title",
    description: "Fetches page titles from HTTP services.",
    categories: "discovery, safe",
    code: "",
  },
  {
    name: "ftp-anon",
    description: "Checks for anonymous FTP access.",
    categories: "auth, safe",
    code: "",
  },
];

const ScriptPlayground: React.FC = () => {
  const [script, setScript] = usePersistentState<ScriptMeta>(
    "nmap-nse-playground",
    {
      name: "",
      description: "",
      categories: "",
      code: "",
    }
  );

  const [filters, setFilters] = React.useState<string[]>([]);

  React.useEffect(() => {
    setScript((s) => ({ ...s, categories: filters.join(", ") }));
  }, [filters, setScript]);

  const toggleFilter = (cat: string) => {
    setFilters((f) =>
      f.includes(cat) ? f.filter((c) => c !== cat) : [...f, cat]
    );
  };

  const filtered = React.useMemo(() => {
    return SAMPLE_SCRIPTS.filter((s) => {
      const cats = s.categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      return filters.every((f) => cats.includes(f));
    });
  }, [filters]);

  const update = (
    key: keyof ScriptMeta
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setScript({ ...script, [key]: e.target.value });
  };

  return (
    <div className="p-4 bg-gray-900 text-white h-full">
      <div className="mb-4">
        <span className="block mb-1">Filter Categories</span>
        <div className="flex flex-wrap gap-2">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleFilter(cat)}
              className={`px-2 py-1 rounded-full text-xs capitalize ${filters.includes(cat) ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <h3 className="text-sm mb-1">Active Filters</h3>
        <div className="flex flex-wrap gap-2">
          {filters.length ? (
            filters.map((f) => (
              <span
                key={f}
                className="px-2 py-1 rounded-full bg-blue-600 text-xs capitalize"
              >
                {f}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">None</span>
          )}
        </div>
      </div>
      <div className="mb-4">
        <h3 className="text-lg mb-2">Scripts</h3>
        <div className="grid grid-cols-1 gap-2">
          {filtered.map((s) => (
            <button
              key={s.name}
              onClick={() => {
                setScript(s);
                const cats = s.categories
                  .split(',')
                  .map((c) => c.trim())
                  .filter(Boolean);
                setFilters(cats);
              }}
              className={`w-full text-left px-2 py-1 rounded font-mono text-sm ${
                script.name === s.name ? 'bg-gray-800' : 'bg-gray-700'
              }`}
            >
              {s.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-gray-400 text-sm">
              No scripts match selected categories.
            </div>
          )}
        </div>
      </div>
      <h2 className="text-xl mb-4">Script Metadata</h2>
      <label className="block mb-1" htmlFor="script-name">
        Name
      </label>
      <input
        id="script-name"
        type="text"
        aria-label="Name"
        value={script.name}
        onChange={update('name')}
        className="w-full p-2 rounded text-black mb-2"
      />
      <label className="block mb-1" htmlFor="script-description">
        Description
      </label>
      <textarea
        id="script-description"
        aria-label="Description"
        value={script.description}
        onChange={update('description')}
        className="w-full p-2 rounded text-black mb-2"
        rows={3}
      />
      <label className="block mb-1" htmlFor="script-code">
        Script
      </label>
      <textarea
        id="script-code"
        aria-label="Script"
        value={script.code}
        onChange={update('code')}
        className="w-full p-2 rounded text-black font-mono mb-2"
        rows={6}
      />
      <div>
        <h3 className="text-lg mb-2">Simulated Output</h3>
        <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
          {OUTPUT_EXAMPLES[script.name] || 'No example available.'}
        </pre>
      </div>
    </div>
  );
};

export default ScriptPlayground;

