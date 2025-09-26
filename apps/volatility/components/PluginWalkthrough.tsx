import React, { useEffect, useState } from 'react';
import plugins from '../../../public/demo-data/volatility/plugins.json';

const VOLATILITY_VERSION = '3.0';

interface PluginInfo {
  name: string;
  description: string;
  output: string;
  minVersion?: string;
}

const PluginWalkthrough: React.FC = () => {
  const data = (Array.isArray(plugins) ? plugins : []) as PluginInfo[];
  const [index, setIndex] = useState(0);
  const hasData = data.length > 0;
  const current = hasData ? data[index % data.length] : undefined;

  useEffect(() => {
    if (!hasData) return;
    data.forEach((p) => {
      if (p.minVersion && p.minVersion !== VOLATILITY_VERSION) {
        console.warn(
          `Plugin ${p.name} requires Volatility ${p.minVersion} but version ${VOLATILITY_VERSION} is loaded.`
        );
      }
    });
  }, [data, hasData]);

  const next = () => hasData && setIndex((i) => (i + 1) % data.length);
  const prev = () =>
    hasData && setIndex((i) => (i - 1 + data.length) % data.length);

  if (!current) {
    return (
      <div className="space-y-2 text-xs">
        <p>No plugin data available.</p>
      </div>
    );
  }

  const output = typeof current.output === 'string' ? current.output : '';
  const description = typeof current.description === 'string' ? current.description : '';

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{current.name}</h2>
        <div className="space-x-2">
          <button onClick={prev} className="px-2 py-1 bg-gray-700 rounded">
            Prev
          </button>
          <button onClick={next} className="px-2 py-1 bg-gray-700 rounded">
            Next
          </button>
        </div>
      </div>
      {current.minVersion && current.minVersion !== VOLATILITY_VERSION && (
        <p className="text-red-400">
          Requires Volatility {current.minVersion}
        </p>
      )}
      <p>{description}</p>
      <pre className="bg-black p-2 rounded overflow-auto whitespace-pre-wrap">
        {output}
      </pre>
    </div>
  );
};

export default PluginWalkthrough;
