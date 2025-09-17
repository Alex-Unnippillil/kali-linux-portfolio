import React, { useMemo, useState } from 'react';
import sampleReport from './sample-report.json';

const severityLevels = ['All', 'Critical', 'High', 'Medium', 'Low'];

const PluginFeedViewer = ({ plugins = sampleReport }) => {
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(
    () =>
      filter === 'All' ? plugins : plugins.filter((p) => p.severity === filter),
    [filter, plugins]
  );

  return (
    <div className="mb-4">
      <h3 className="text-lg mb-2">Plugin Feed</h3>
      <div
        role="radiogroup"
        aria-label="Filter plugins by severity"
        className="flex flex-wrap gap-2 mb-2"
      >
        {severityLevels.map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            aria-pressed={filter === level}
            className={`px-3 py-1 rounded-full text-sm border focus-ring ${
              filter === level
                ? 'bg-white text-black border-gray-300'
                : 'bg-gray-800 text-white border-gray-600'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <ul className="space-y-1">
        {filtered.map((plugin) => (
          <li key={plugin.id} className="border-b border-gray-700 pb-1 text-sm">
            <div className="font-semibold">{plugin.name}</div>
            <div className="text-xs text-gray-400">
              {plugin.severity} - CVSS {plugin.cvss}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PluginFeedViewer;
