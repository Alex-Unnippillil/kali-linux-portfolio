import React, { useState } from 'react';
import plugins from '../../../public/demo-data/volatility/plugins.json';

interface PluginInfo {
  name: string;
  description: string;
  output: string;
}

const PluginWalkthrough: React.FC = () => {
  const data = plugins as PluginInfo[];
  const [index, setIndex] = useState(0);
  const current = data[index];

  const next = () => setIndex((i) => (i + 1) % data.length);
  const prev = () => setIndex((i) => (i - 1 + data.length) % data.length);

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
      <p>{current.description}</p>
      <pre className="bg-black p-2 rounded overflow-auto whitespace-pre-wrap">
        {current.output}
      </pre>
    </div>
  );
};

export default PluginWalkthrough;
