import React, { useEffect, useMemo, useState } from 'react';
import plugins from '../../../public/demo-data/volatility/plugins.json';
import { compactUi } from '../shared/compactUi';

const VOLATILITY_VERSION = '3.0';

const categoryAccent = {
  Processes: 'bg-sky-950/50 text-sky-100 border border-sky-500/50',
  Network: 'bg-emerald-950/50 text-emerald-100 border border-emerald-500/50',
  Malware: 'bg-rose-950/60 text-rose-100 border border-rose-500/70 shadow-lg shadow-rose-900/20',
};

const PluginBrowser = () => {
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(plugins.map((p) => p.category)))],
    []
  );

  useEffect(() => {
    plugins.forEach((p) => {
      if (p.minVersion && p.minVersion !== VOLATILITY_VERSION) {
        console.warn(
          `Plugin ${p.name} requires Volatility ${p.minVersion} but version ${VOLATILITY_VERSION} is loaded.`
        );
      }
    });
  }, []);

  const filtered = plugins.filter(
    (p) => category === 'All' || p.category === category
  );

  return (
    <div className="space-y-4 text-xs text-gray-200">
      <p className={`rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 ${compactUi.bodySmall} text-amber-100`}>
        Plugin data is provided for educational use only. Highlighted entries indicate simulated suspicious artefacts.
      </p>
      <div className="flex items-center gap-2">
        <svg
          className="h-6 w-6 text-gray-400"
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
          className={`rounded border border-gray-700 bg-gray-900 px-2 py-1 ${compactUi.bodySmall}`}
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
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((p) => (
          <div
            key={p.name}
            className="cursor-pointer rounded-xl border border-gray-800 bg-gray-900/60 p-3 transition hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-900/20"
            onClick={() => setSelected(p)}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">{p.name}</h3>
              <span
                className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${compactUi.chipSmall} ${
                  categoryAccent[p.category] || 'bg-gray-800 text-gray-200'
                }`}
              >
                {p.category}
              </span>
            </div>
            {p.minVersion && p.minVersion !== VOLATILITY_VERSION && (
              <p className={`${compactUi.labelSmall} mt-1 text-rose-300`}>
                Requires Volatility {p.minVersion}
              </p>
            )}
            <p className={`mt-2 ${compactUi.bodySmall} text-gray-300`}>{p.description}</p>
            <a
              href={p.doc}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 inline-flex items-center gap-1 ${compactUi.bodySmall} text-amber-300 underline decoration-dotted underline-offset-2`}
            >
              Volatility 3 docs
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        ))}
      </div>
      {selected && (
        <div className={`rounded-xl border border-gray-800 bg-black/70 ${compactUi.bodySmall}`}>
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
            <h4 className="text-sm font-semibold text-white">
              {selected.name} sample output
            </h4>
            <button
              type="button"
              className={`rounded-full border border-gray-700 px-2 py-0.5 ${compactUi.chipSmall} text-gray-300 transition hover:border-amber-500 hover:text-amber-200`}
              onClick={() => setSelected(null)}
            >
              Clear
            </button>
          </div>
          <div className="max-h-64 overflow-auto font-mono">
            {selected.output.split('\n').map((line, i) => {
              const lower = line.toLowerCase();
              const severityClass = lower.includes('malicious')
                ? 'bg-rose-950/70 text-rose-100'
                : lower.includes('suspicious') || lower.includes('suspect')
                ? 'bg-amber-950/50 text-amber-100'
                : 'text-gray-200';

              return (
                <div
                  key={i}
                  className={`px-3 py-1 ${i % 2 ? 'bg-gray-900/80' : 'bg-gray-900/40'} ${severityClass}`}
                >
                  {line || '\u00A0'}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginBrowser;
