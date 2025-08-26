import React, { useState } from 'react';

export const availablePlugins = ['pslist', 'dlllist', 'netscan'];

export const timelineToCSV = (timeline) => {
  const header = 'time,event';
  const rows = timeline.map((t) => `${t.time},${t.event}`);
  return [header, ...rows].join('\n');
};

export const timelineToJSON = (timeline) => JSON.stringify(timeline, null, 2);

const VolatilityApp = () => {
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [plugins, setPlugins] = useState(
    availablePlugins.reduce((acc, p) => ({ ...acc, [p]: true }), {})
  );
  const [timeline, setTimeline] = useState([]);

  const togglePlugin = (plugin) =>
    setPlugins((prev) => ({ ...prev, [plugin]: !prev[plugin] }));

  const captureMemory = () => {
    const data = new Blob(['Placeholder memory data']);
    const memoryFile = new File([data], 'memory.img');
    setFile(memoryFile);
    setOutput('Captured live memory');
  };

  const generateTimeline = () => {
    setTimeline([
      { time: '00:00', event: 'System boot' },
      { time: '00:05', event: 'Process started' },
    ]);
  };

  const exportTimeline = (format) => {
    if (!timeline.length) return;
    const data =
      format === 'csv' ? timelineToCSV(timeline) : timelineToJSON(timeline);
    const blob = new Blob([data], {
      type: format === 'csv' ? 'text/csv' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setOutput('');
    const enabled = Object.entries(plugins)
      .filter(([, v]) => v)
      .map(([k]) => k);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('plugins', JSON.stringify(enabled));
      const res = await fetch('/api/volatility', {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      setOutput(text || `Ran plugins: ${enabled.join(', ')}`);
    } catch (err) {
      setOutput('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <div className="p-4 space-y-2">
        <div className="flex space-x-2">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="flex-1 text-black"
          />
          <button
            onClick={captureMemory}
            className="px-2 py-1 bg-blue-600 rounded"
            data-testid="capture-memory"
          >
            Capture Live Memory
          </button>
        </div>
        <div className="space-y-1">
          <div className="font-bold">Plugins</div>
          {availablePlugins.map((plugin) => (
            <label key={plugin} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={plugins[plugin]}
                onChange={() => togglePlugin(plugin)}
                data-testid={`plugin-${plugin}`}
              />
              <span>{plugin}</span>
            </label>
          ))}
        </div>
        <button
          onClick={analyze}
          disabled={!file || loading}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
        <div className="space-y-2">
          <button
            onClick={generateTimeline}
            className="px-2 py-1 bg-purple-600 rounded"
            data-testid="generate-timeline"
          >
            Generate Timeline
          </button>
          {timeline.length > 0 && (
            <div className="space-y-1">
              <div className="flex space-x-2">
                <button
                  onClick={() => exportTimeline('csv')}
                  className="px-2 py-1 bg-gray-600 rounded"
                  data-testid="export-csv"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportTimeline('json')}
                  className="px-2 py-1 bg-gray-600 rounded"
                  data-testid="export-json"
                >
                  Export JSON
                </button>
              </div>
              <ul className="list-disc pl-5">
                {timeline.map((t, i) => (
                  <li key={i}>{`${t.time} - ${t.event}`}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <pre className="flex-1 overflow-auto p-4 bg-black text-green-400 whitespace-pre-wrap">
        {output}
      </pre>
    </div>
  );
};

export default VolatilityApp;

export const displayVolatility = () => {
  return <VolatilityApp />;
};

