import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../hooks/usePersistentState';

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const modules = [
  'DNS Enumeration',
  'WHOIS Lookup',
  'Reverse IP Lookup',
];

const moduleFlow = {
  nodes: modules.map((m) => ({ id: m })),
  links: [
    { source: 'DNS Enumeration', target: 'WHOIS Lookup' },
    { source: 'WHOIS Lookup', target: 'Reverse IP Lookup' },
  ],
};

const sampleData = {
  'DNS Enumeration': [
    { Record: 'A', Name: 'example.com', Value: '93.184.216.34' },
    { Record: 'MX', Name: 'mail.example.com', Value: '93.184.216.35' },
  ],
  'WHOIS Lookup': [
    { Field: 'Registrar', Value: 'Example Registrar Inc.' },
    { Field: 'Creation Date', Value: '2000-01-01' },
  ],
  'Reverse IP Lookup': [
    { IP: '93.184.216.34', Domain: 'example.com' },
    { IP: '93.184.216.34', Domain: 'example.net' },
  ],
};

const recommendations = {
  'DNS Enumeration':
    'Monitor DNS records and limit exposure of internal subdomains.',
  'WHOIS Lookup':
    'Use privacy protection services to mask registrant details.',
  'Reverse IP Lookup':
    'Review hosted domains and ensure unused ones are removed.',
};

const ReconNG = () => {
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [target, setTarget] = useState('example.com');
  const [output, setOutput] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [currentData, setCurrentData] = useState([]);
  const [view, setView] = useState('run');
  const [marketplace, setMarketplace] = useState([]);
  const [apiKeys, setApiKeys] = usePersistentState('reconng-api-keys', {});

  useEffect(() => {
    fetch('/reconng-marketplace.json')
      .then((r) => r.json())
      .then((d) => setMarketplace(d.modules || []))
      .catch(() => {});
  }, []);

  const allModules = [...modules, ...marketplace];

  const formatOutput = (data) =>
    data.map((row) => Object.values(row).join(' | ')).join('\n');

  const runModule = () => {
    if (!target) return;
    const data = sampleData[selectedModule] || [];
    setCurrentData(data);
    setOutput(formatOutput(data));
    setGraphData({
      nodes: [
        { id: selectedModule },
        ...data.map((row, i) => ({ id: Object.values(row).join(': ') })),
      ],
      links: data.map((row) => ({
        source: selectedModule,
        target: Object.values(row).join(': '),
      })),
    });
  };

  const exportCSV = () => {
    if (!currentData.length) return;
    const headers = Object.keys(currentData[0]);
    const rows = currentData.map((row) =>
      headers.map((h) => `"${row[h]}"`).join(','),
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedModule.replace(/\s+/g, '_')}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 text-white p-4">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView('run')}
          className={`px-2 py-1 ${view === 'run' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Run
        </button>
        <button
          type="button"
          onClick={() => setView('settings')}
          className={`px-2 py-1 ${view === 'settings' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setView('marketplace')}
          className={`px-2 py-1 ${view === 'marketplace' ? 'bg-blue-600' : 'bg-gray-800'}`}
        >
          Marketplace
        </button>
      </div>
      {view === 'run' && (
        <>
          <div className="bg-black p-2 mb-4" style={{ height: '200px' }}>
            <ForceGraph2D graphData={moduleFlow} />
          </div>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-gray-800 px-2 py-1"
            >
              {allModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target"
              className="flex-1 bg-gray-800 px-2 py-1"
            />
            <button
              type="button"
              onClick={runModule}
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
            >
              Run
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={!currentData.length}
              className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
          <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap mb-2">{output}</pre>
          {currentData.length > 0 && (
            <div className="mb-2">
              <strong>Next steps:</strong> {recommendations[selectedModule]}
            </div>
          )}
          {graphData.nodes.length > 0 && (
            <div className="bg-black p-2" style={{ height: '300px' }}>
              <ForceGraph2D graphData={graphData} />
            </div>
          )}
        </>
      )}
      {view === 'settings' && (
        <div className="flex-1 overflow-auto">
          {allModules.map((m) => (
            <div key={m} className="mb-2">
              <label className="block mb-1">{`${m} API Key`}</label>
              <input
                type="text"
                value={apiKeys[m] || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, [m]: e.target.value })}
                className="w-full bg-gray-800 px-2 py-1"
                placeholder={`${m} API Key`}
              />
            </div>
          ))}
        </div>
      )}
      {view === 'marketplace' && (
        <ul className="list-disc pl-5">
          {marketplace.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReconNG;

export const displayReconNG = () => <ReconNG />;

