import React from 'react';
import plugins from '../../../public/demo-data/volatility/plugins.json';

const PluginBrowser = () => (
  <div className="space-y-3">
    {plugins.map((p) => (
      <div key={p.name} className="bg-gray-800 p-3 rounded">
        <h3 className="font-semibold text-sm">{p.name}</h3>
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
  </div>
);

export default PluginBrowser;
