import React, { useEffect, useRef, useState } from 'react';
import MemoryHeatmap from './MemoryHeatmap';
import PluginBrowser from './PluginBrowser';
import PluginWalkthrough from '../../../apps/volatility/components/PluginWalkthrough';
import memoryFixture from '../../../public/demo-data/volatility/memory.json';
import pslistJson from '../../../public/demo-data/volatility/pslist.json';
import netscanJson from '../../../public/demo-data/volatility/netscan.json';

// pull demo data for various volatility plugins from the memory fixture
const pstree = Array.isArray(memoryFixture.pstree)
  ? memoryFixture.pstree
  : [];
const dlllist = memoryFixture.dlllist ?? {};
const pslist = Array.isArray(pslistJson.rows) ? pslistJson.rows : [];
const pslistColumns = Array.isArray(pslistJson.columns) ? pslistJson.columns : [];
const netscan = Array.isArray(netscanJson.rows) ? netscanJson.rows : [];
const netscanColumns = Array.isArray(netscanJson.columns) ? netscanJson.columns : [];
const malfind = Array.isArray(memoryFixture.malfind)
  ? memoryFixture.malfind
  : [];
const yarascan = Array.isArray(memoryFixture.yarascan)
  ? memoryFixture.yarascan
  : [];
const memoryDemo = memoryFixture;


const heuristicColors = {
  informational: 'bg-blue-600',
  suspicious: 'bg-yellow-600',
  malicious: 'bg-red-600',
};

const glossary = {
  pstree: {
    title: 'Process Tree',
    description: 'Hierarchy of running processes.',
    link: '/docs/template-glossary#process-tree',
  },
  pslist: {
    title: 'Process List',
    description: 'Active processes captured from memory.',
    link: '/docs/template-glossary#pslist',
  },
  dlllist: {
    title: 'Module List',
    description: 'DLLs and modules loaded by the selected process.',
    link: '/docs/template-glossary#module',
  },
  netscan: {
    title: 'Network Connections',
    description: 'Sockets and network endpoints identified in memory.',
    link: '/docs/template-glossary#netscan',
  },
  malfind: {
    title: 'Malfind',
    description: 'Heuristics to locate injected or malicious code.',
    link: '/docs/template-glossary#malfind',
  },
  yara: {
    title: 'Yara Scan',
    description: 'Pattern-based rules that highlight suspicious memory content.',
    link: '/docs/template-glossary#yara',
  },
};

const SortableTable = ({ columns, data, onRowClick }) => {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  const sorted = React.useMemo(() => {
    if (!sort.key) return safeData;
    const sortedData = [...safeData].sort((a, b) => {
      if (a[sort.key] < b[sort.key]) return sort.dir === 'asc' ? -1 : 1;
      if (a[sort.key] > b[sort.key]) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sortedData;
  }, [safeData, sort]);

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
          {safeColumns.map((col) => (
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
          <tr
            key={i}
            className="odd:bg-gray-800 cursor-pointer"
            onClick={() => onRowClick && onRowClick(row)}
          >
            {safeColumns.map((col) => (
              <td key={col.key} className="px-2 py-1 whitespace-nowrap">
                {col.render ? col.render(row) : row[col.key]}
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
  const [activeTab, setActiveTab] = useState('pstree');
  const [selectedPid, setSelectedPid] = useState(null);
  const [finding, setFinding] = useState(null);
  const workerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
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
      workerRef.current?.postMessage({ segments: memoryDemo.segments });
      setOutput('Analysis simulated with demo memory plugin output.');
    } catch (err) {
      setOutput('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const TreeNode = ({ node }) => (
    <li>
      <span
        className="cursor-pointer hover:underline"
        onClick={() => {
          setSelectedPid(node.pid);
          setFinding(glossary.pstree);
        }}
      >
        {node.name} ({node.pid})
      </span>
      {node.children && node.children.length > 0 && (
        <ul className="ml-4">
          {node.children.map((child) => (
            <TreeNode key={child.pid} node={child} />
          ))}
        </ul>
      )}
    </li>
  );

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
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="flex space-x-2 px-2 bg-gray-900">
            {['pstree', 'pslist', 'netscan', 'malfind', 'yarascan', 'plugins', 'walkthrough'].map((tab) => (
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
            {activeTab === 'pstree' && (
              <div>
                <p className="text-xs mb-2">{glossary.pstree.description}</p>
                <div className="flex space-x-4">
                  <ul className="w-1/2 text-xs">
                    {pstree.map((node) => (
                      <TreeNode key={node.pid} node={node} />
                    ))}
                  </ul>
                  <div className="w-1/2">
                    {selectedPid ? (
                      <>
                        <h3 className="text-sm mb-2">Modules for PID {selectedPid}</h3>
                        <SortableTable
                          columns={[
                            { key: 'base', label: 'Base' },
                            { key: 'name', label: 'Name' },
                          ]}
                          data={Array.isArray(dlllist[selectedPid]) ? dlllist[selectedPid] : []}
                          onRowClick={() => setFinding(glossary.dlllist)}
                        />
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Select a process to view modules.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'pslist' && (
              <div>
                <p className="text-xs mb-2">{glossary.pslist.description}</p>
                <SortableTable
                  columns={pslistColumns}
                  data={pslist}
                  onRowClick={() => setFinding(glossary.pslist)}
                />
              </div>
            )}
            {activeTab === 'netscan' && (
              <div>
                <p className="text-xs mb-2">{glossary.netscan.description}</p>
                <SortableTable
                  columns={netscanColumns}
                  data={netscan}
                  onRowClick={() => setFinding(glossary.netscan)}
                />
              </div>
            )}
            {activeTab === 'malfind' && (
              <div>
                <p className="text-xs mb-2">{glossary.malfind.description}</p>
                <SortableTable
                  columns={[
                    { key: 'pid', label: 'PID' },
                    { key: 'address', label: 'Address' },
                    { key: 'protection', label: 'Protection' },
                    { key: 'description', label: 'Description' },
                  ]}
                  data={malfind}
                  onRowClick={() => setFinding(glossary.malfind)}
                />
              </div>
            )}
            {activeTab === 'yarascan' && (
              <div>
                <p className="text-xs mb-2">{glossary.yara.description}</p>
                <SortableTable
                  columns={[
                    { key: 'pid', label: 'PID' },
                    { key: 'rule', label: 'Rule' },
                    { key: 'address', label: 'Address' },
                    {
                      key: 'heuristic',
                      label: 'Heuristic',
                      render: (row) => (
                        <span
                          className={`px-2 py-0.5 rounded ${
                            heuristicColors[row.heuristic] || 'bg-gray-700'
                          }`}
                        >
                          {row.heuristic}
                        </span>
                      ),
                    },
                  ]}
                  data={yarascan}
                  onRowClick={() => setFinding(glossary.yara)}
                />
              </div>
            )}
            {activeTab === 'plugins' && <PluginBrowser />}
            {activeTab === 'walkthrough' && <PluginWalkthrough />}
          </div>
        </div>
        {finding && (
          <aside className="w-64 p-3 border-l border-gray-700 bg-gray-900">
            <h3 className="text-sm font-semibold mb-2">Explain this finding</h3>
            <p className="text-xs mb-2">{finding.description}</p>
            <a
              href={finding.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 underline"
            >
              Learn more
            </a>
            <button
              onClick={() => setFinding(null)}
              className="mt-2 text-xs text-red-400"
            >
              Close
            </button>
          </aside>
        )}
      </div>
      {output && (
        <div className="h-32 overflow-auto bg-black text-white text-xs font-mono rounded">
          {output.split('\n').map((line, i) => (
            <div key={i} className={`px-2 ${i % 2 ? 'bg-gray-900' : 'bg-gray-800'}`}>
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolatilityApp;

export const displayVolatility = () => {
  return <VolatilityApp />;
};
