import React, { useEffect, useRef, useState } from 'react';
import MemoryHeatmap from './MemoryHeatmap';
import PluginBrowser from './PluginBrowser';
import PluginWalkthrough from '../../../apps/volatility/components/PluginWalkthrough';
import inspectHeader from './profileDetection';
import memoryFixture from '../../../public/demo-data/volatility/memory.json';
import pslistJson from '../../../public/demo-data/volatility/pslist.json';
import netscanJson from '../../../public/demo-data/volatility/netscan.json';

// pull demo data for various volatility plugins from the memory fixture
const pstree = Array.isArray(memoryFixture.pstree)
  ? memoryFixture.pstree
  : [];
const dlllist = memoryFixture.dlllist ?? {};
const pslist = Array.isArray(pslistJson.rows) ? pslistJson.rows : [];
const pslistColumns = pslistJson.columns ?? [];
const netscan = Array.isArray(netscanJson.rows) ? netscanJson.rows : [];
const netscanColumns = netscanJson.columns ?? [];
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

const confidenceColors = {
  high: 'text-green-400',
  medium: 'text-yellow-300',
  low: 'text-orange-300',
  none: 'text-gray-400',
};

const formatFileSize = (size) => {
  if (typeof size !== 'number' || Number.isNaN(size)) {
    return '';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const HEADER_SLICE_LIMIT = 8192;

const readSampleChunk = async (file, limit = HEADER_SLICE_LIMIT) => {
  const chunk = file.slice(0, limit);
  if (typeof chunk.arrayBuffer === 'function') {
    return chunk.arrayBuffer();
  }
  if (typeof Response !== 'undefined') {
    return new Response(chunk).arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        resolve(reader.result?.buffer);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(chunk);
  });
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
          <tr
            key={i}
            className="odd:bg-gray-800 cursor-pointer"
            onClick={() => onRowClick && onRowClick(row)}
          >
            {columns.map((col) => (
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
  const [profileInsights, setProfileInsights] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileProcessing, setProfileProcessing] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./heatmap.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => setHeatmapData(e.data);
      workerRef.current.postMessage({ segments: memoryDemo.segments });
    }
    return () => workerRef.current?.terminate();
  }, []);

  const handleSampleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setProfileProcessing(true);
    setProfileError('');
    try {
      const timer =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? () => performance.now()
          : () => Date.now();
      const start = timer();
      const buffer = await readSampleChunk(file);
      const inspection = inspectHeader(buffer);
      const duration = Math.round(timer() - start);
      if (duration > 500) {
        console.warn(`Header inspection exceeded 500 ms budget: ${duration} ms`);
      }
      setProfileInsights({
        ...inspection,
        fileName: file.name,
        fileSize: file.size,
        duration,
      });
    } catch (error) {
      console.error('Unable to inspect header', error);
      setProfileInsights(null);
      setProfileError('Unable to inspect the memory sample header.');
    } finally {
      setProfileProcessing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

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
      <div className="p-4 space-y-4 border-b border-gray-800 bg-gray-900">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Memory sample inspector</h2>
          <p className="text-xs text-gray-400">
            Upload a small slice of a memory image to infer the most likely Volatility profile. Only the first {Math.round(
              HEADER_SLICE_LIMIT / 1024
            )}{' '}
            KB are scanned to keep parsing under the 500 ms budget.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label htmlFor="volatility-sample" className="font-semibold text-gray-200">
              Memory sample
            </label>
            <input
              id="volatility-sample"
              type="file"
              accept=".raw,.bin,.mem,.img,.lime"
              className="text-xs text-gray-200"
              onChange={handleSampleUpload}
              disabled={profileProcessing}
              aria-label="Upload memory sample"
            />
            {profileProcessing && <span className="text-[11px] text-gray-400">Inspecting…</span>}
          </div>
          {profileError && (
            <p className="text-xs text-red-400" role="alert">
              {profileError}
            </p>
          )}
          {profileInsights && (
            <div className="space-y-2 bg-gray-950 border border-gray-800 rounded p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-gray-400">Detected profile:</span>{' '}
                  <span className="font-semibold">
                    {profileInsights.profile ? profileInsights.profile.label : 'No direct match'}
                  </span>
                </div>
                <div className="text-gray-400">
                  <span className="font-semibold text-gray-300">Runtime:</span> {profileInsights.duration} ms
                </div>
              </div>
              <div>
                <span className="text-gray-400">Confidence:</span>{' '}
                <span
                  className={`${
                    confidenceColors[profileInsights.confidence.level] || 'text-gray-400'
                  } font-semibold`}
                >
                  {profileInsights.confidence.level.toUpperCase()}
                </span>
                {profileInsights.confidence.score > 0 && (
                  <span className="text-gray-500"> ({Math.round(profileInsights.confidence.score * 100)}%)</span>
                )}
              </div>
              {profileInsights.family && (
                <p className="text-[11px] text-gray-400 capitalize">
                  Family hint: {profileInsights.family}
                </p>
              )}
              {profileInsights.note && (
                <p className="text-[11px] text-gray-300 leading-relaxed">{profileInsights.note}</p>
              )}
              <p className="text-[11px] text-gray-500">
                File: {profileInsights.fileName}{' '}
                {typeof profileInsights.fileSize === 'number'
                  ? `(${formatFileSize(profileInsights.fileSize)})`
                  : ''}
              </p>
              {profileInsights.suggestions && profileInsights.suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] text-yellow-300">Suggested alternatives:</p>
                  <ul className="text-[11px] list-disc list-inside text-gray-200 space-y-0.5">
                    {profileInsights.suggestions.map((suggestion) => (
                      <li key={suggestion.slug}>
                        {suggestion.label}{' '}
                        <span className="text-gray-500">
                          ({Math.round(suggestion.confidence * 100)}% match)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p
                className={`text-[11px] ${
                  profileInsights.duration > 500 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                Header inspection {profileInsights.duration > 500 ? 'exceeded' : 'completed within'} the 500 ms target.
              </p>
            </div>
          )}
        </div>
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
                          data={dlllist[selectedPid] || []}
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
