import React, { useEffect, useMemo, useState } from 'react';
import plugins from '../../../public/demo-data/volatility/plugins.json';

const VOLATILITY_VERSION = '3.0';

const PluginBrowser = () => {
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);

  const pluginList = useMemo(() => (Array.isArray(plugins) ? plugins : []), []);

  const categories = useMemo(() => {
    const unique = new Set();
    pluginList.forEach((p) => {
      if (p?.category) {
        unique.add(p.category);
      }
    });
    return ['All', ...Array.from(unique)];
  }, [pluginList]);

  useEffect(() => {
    pluginList.forEach((p) => {
      if (p.minVersion && p.minVersion !== VOLATILITY_VERSION) {
        console.warn(
          `Plugin ${p.name} requires Volatility ${p.minVersion} but version ${VOLATILITY_VERSION} is loaded.`
        );
      }
    });
  }, [pluginList]);

  const filtered = pluginList.filter(
    (p) => category === 'All' || p.category === category
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-yellow-400">
        Plugin data is provided for educational use only.
      </p>
      <div className="flex items-center gap-2">
        <svg
          className="w-6 h-6 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 4h18l-7 8v6l-4 2v-8z" />
        </svg>
        <select
          className="bg-gray-800 text-xs p-1 rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {filtered.map((p) => (
        <div
          key={p.name}
          className="bg-gray-800 p-3 rounded cursor-pointer"
          onClick={() => setSelected(p)}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{p.name}</h3>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-700 text-[10px]">
              {p.category}
            </span>
          </div>
          {p.minVersion && p.minVersion !== VOLATILITY_VERSION && (
            <p className="text-[10px] text-red-400">
              Requires Volatility {p.minVersion}
            </p>
          )}
          <p className="text-xs mb-1">{p.description}</p>
          <a
            href={p.doc}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 underline"
          >
            Volatility 3 docs
          </a>
        </div>
      ))}
      {selected && typeof selected.output === 'string' && (
        <div className="text-xs bg-black rounded overflow-auto">
          {selected.output.split('\n').map((line, i) => (
            <div key={i} className={`px-2 ${i % 2 ? 'bg-gray-900' : 'bg-gray-800'}`}>
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PluginBrowser;
