import React, { useEffect, useRef, useState } from 'react';
import MemoryHeatmap from './MemoryHeatmap';
import PluginBrowser from './PluginBrowser';
import memoryDemo from '../../../public/demo-data/volatility/memory.json';

const demoPslist = [
  { pid: 4, ppid: 0, name: 'System' },
  { pid: 248, ppid: 4, name: 'smss.exe' },
  { pid: 612, ppid: 248, name: 'csrss.exe' },
];

const demoNetscan = [
  { proto: 'TCP', local: '0.0.0.0:80', foreign: '0.0.0.0:0', state: 'LISTENING' },
  { proto: 'UDP', local: '127.0.0.1:53', foreign: '0.0.0.0:0', state: 'NONE' },
  {
    proto: 'TCP',
    local: '192.168.1.5:445',
    foreign: '192.168.1.10:51234',
    state: 'ESTABLISHED',
  },
];

const demoMalfind = [
  { pid: 612, address: '0x7f12a000', protection: 'RWX', description: 'Injected Code' },
  { pid: 700, address: '0x401000', protection: 'RWX', description: 'Suspicious Section' },
];

const SortableTable = ({ columns, data }) => {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  const sorted = React.useMemo(() => {
    if (!sort.key) return data;
    const sortedData = [...data].sort((a, b) => {
      if (a[sort.key] < b[sort.key]) return sort.dir === 'asc' ? -1 : 1;
      if (a[sort.key] > b[sort.key]) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sortedData;
  }, [data, sort]);

  const toggleSort = (key) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <table className="w-full text-xs table-auto">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className="cursor-pointer px-2 py-1 text-left bg-gray-700"
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={i} className="odd:bg-gray-800">
            {columns.map((col) => (
              <td key={col.key} className="px-2 py-1 whitespace-nowrap">
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const VolatilityApp = () => {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [activeTab, setActiveTab] = useState('pslist');
  const workerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
      workerRef.current = new Worker(new URL('./heatmap.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => setHeatmapData(e.data);
      workerRef.current.postMessage({ segments: memoryDemo.segments });
    }
    return () => workerRef.current?.terminate();
  }, []);

  const analyze = async () => {
    setLoading(true);
    setOutput('');
    try {
      // Simulated analysis using static demo data
      workerRef.current?.postMessage({ segments: memoryDemo.segments });
      setOutput('Analysis simulated with demo memory plugin output.');
    } catch (err) {
      setOutput('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <div className="p-4 space-y-2">
        <button
          onClick={analyze}
          disabled={loading}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
      <MemoryHeatmap data={heatmapData} />
      <div className="flex-1 flex flex-col">
        <div className="flex space-x-2 px-2 bg-gray-900">
          {['pslist', 'netscan', 'malfind', 'plugins'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 text-sm rounded ${
                activeTab === tab ? 'bg-gray-700' : 'bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-2">
          {activeTab === 'pslist' && (
            <SortableTable
              columns={[
                { key: 'pid', label: 'PID' },
                { key: 'ppid', label: 'PPID' },
                { key: 'name', label: 'Name' },
              ]}
              data={demoPslist}
            />
          )}
          {activeTab === 'netscan' && (
            <SortableTable
              columns={[
                { key: 'proto', label: 'Proto' },
                { key: 'local', label: 'LocalAddr' },
                { key: 'foreign', label: 'ForeignAddr' },
                { key: 'state', label: 'State' },
              ]}
              data={demoNetscan}
            />
          )}
          {activeTab === 'malfind' && (
            <SortableTable
              columns={[
                { key: 'pid', label: 'PID' },
                { key: 'address', label: 'Address' },
                { key: 'protection', label: 'Protection' },
                { key: 'description', label: 'Description' },
              ]}
              data={demoMalfind}
            />
          )}
          {activeTab === 'plugins' && <PluginBrowser />}
        </div>
      </div>
      {output && (
        <pre className="h-32 overflow-auto p-4 bg-black text-green-400 whitespace-pre-wrap">
          {output}
        </pre>
      )}
    </div>
  );
};

export default VolatilityApp;

export const displayVolatility = () => {
  return <VolatilityApp />;
};

