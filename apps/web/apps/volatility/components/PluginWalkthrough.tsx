import React, { useEffect, useState } from 'react';
import plugins from '../../../public/demo-data/volatility/plugins.json';

const VOLATILITY_VERSION = '3.0';

type PluginInfo = {
  name: string;
  description: string;
  output: string;
  minVersion?: string;
};

type Severity = 'informational' | 'suspicious' | 'malicious';

const badgeStyles: Record<Severity, string> = {
  informational: 'bg-sky-950/40 text-sky-100 border border-sky-500/40',
  suspicious: 'bg-amber-950/40 text-amber-100 border border-amber-500/50 shadow shadow-amber-900/20',
  malicious: 'bg-rose-950/50 text-rose-100 border border-rose-500/60 shadow-lg shadow-rose-900/30',
};

const classifyLine = (line: string): Severity | null => {
  const lower = line.toLowerCase();
  if (lower.includes('malicious') || lower.includes('suspect')) {
    return 'malicious';
  }
  if (lower.includes('suspicious')) {
    return 'suspicious';
  }
  return null;
};

const PluginWalkthrough: React.FC = () => {
  const data = plugins as PluginInfo[];
  const [index, setIndex] = useState(0);
  const current = data[index];

  useEffect(() => {
    data.forEach((p) => {
      if (p.minVersion && p.minVersion !== VOLATILITY_VERSION) {
        console.warn(
          `Plugin ${p.name} requires Volatility ${p.minVersion} but version ${VOLATILITY_VERSION} is loaded.`
        );
      }
    });
  }, [data]);

  const next = () => setIndex((i) => (i + 1) % data.length);
  const prev = () => setIndex((i) => (i - 1 + data.length) % data.length);

  return (
    <section className="space-y-3 rounded-xl border border-gray-800 bg-gray-950/80 p-4 text-xs text-gray-200 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{current.name}</h2>
          <p className="text-[11px] text-gray-400">Interactive walkthrough of common Volatility 3 plugins.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-[11px] font-medium text-gray-200 transition hover:border-amber-500 hover:text-amber-200"
          >
            Prev
          </button>
          <button
            onClick={next}
            className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-[11px] font-medium text-gray-200 transition hover:border-amber-500 hover:text-amber-200"
          >
            Next
          </button>
        </div>
      </div>
      {current.minVersion && current.minVersion !== VOLATILITY_VERSION && (
        <p className="text-[11px] text-rose-300">
          Requires Volatility {current.minVersion}
        </p>
      )}
      <p className="text-[11px] text-gray-300">{current.description}</p>
      <div className="max-h-64 overflow-auto rounded-lg border border-gray-800 bg-black/70 font-mono">
        {current.output.split('\n').map((line, i) => {
          const severity = classifyLine(line);
          const accent = severity ? badgeStyles[severity] : 'text-gray-200';

          return (
            <div
              key={i}
              className={`px-3 py-1 ${i % 2 ? 'bg-gray-900/80' : 'bg-gray-900/40'} ${accent}`}
            >
              {line || '\u00A0'}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PluginWalkthrough;
