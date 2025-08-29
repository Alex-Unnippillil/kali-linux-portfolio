import React, { useMemo, useState } from 'react';
import plugins from '../../../public/demo-data/volatility/plugins.json';

const SUPPORTED_VERSION = '3.0';

const PluginBrowser = () => {
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(plugins.map((p) => p.category)))],
    []
  );

  const filtered = plugins.filter(
    (p) => category === 'All' || p.category === category
  );

  const isIncompatible = (p) => p.version && p.version !== SUPPORTED_VERSION;

  return (
    <div className="space-y-3">
      <p className="text-xs text-yellow-400">
        Plugin data is provided for educational use only.
      </p>
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
      {filtered.map((p) => (
        <div
          key={p.name}
          className="bg-gray-800 p-3 rounded cursor-pointer"
          onClick={() => setSelected(p)}
        >
          <h3 className="font-semibold text-sm">{p.name}</h3>
          <p className="text-[10px] text-gray-400">{p.category}</p>
          {p.version && (
            <p className="text-[10px] text-gray-400">v{p.version}</p>
          )}
          {isIncompatible(p) && (
            <p className="text-[10px] text-red-400">
              Incompatible with Volatility {SUPPORTED_VERSION}
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
      {selected && (
        <>
          {isIncompatible(selected) && (
            <p className="text-red-400 text-xs">
              Plugin targets Volatility {selected.version}; app supports {SUPPORTED_VERSION}.
            </p>
          )}
          <pre className="text-xs bg-black p-3 rounded overflow-auto">
            {selected.output}
          </pre>
        </>
      )}
    </div>
  );
};

export default PluginBrowser;
