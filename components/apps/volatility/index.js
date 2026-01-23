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

const severityPalette = {
  informational: {
    chip:
      'border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] text-[color:var(--kali-terminal-text)]',
    row:
      'border-l border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_96%,transparent)]',
  },
  suspicious: {
    chip:
      'border border-[color:color-mix(in_srgb,var(--kali-blue)_65%,transparent)] bg-yellow-600 bg-[color:color-mix(in_srgb,var(--kali-panel)_86%,rgba(15,148,210,0.25))] text-[color:var(--kali-terminal-text)] shadow-[0_0_10px_color-mix(in_srgb,var(--kali-blue)_32%,transparent)]',
    row:
      'border-l-4 border-[color:color-mix(in_srgb,var(--kali-blue)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,rgba(15,148,210,0.22))]',
  },
  malicious: {
    chip:
      'border border-[color:color-mix(in_srgb,var(--color-error)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,rgba(255,77,109,0.32))] text-[color:var(--kali-terminal-text)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-error)_34%,transparent)]',
    row:
      'border-l-4 border-[color:color-mix(in_srgb,var(--color-error)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_84%,rgba(255,77,109,0.3))]',
  },
};

const heuristicColors = {
  informational: severityPalette.informational.chip,
  suspicious: `${severityPalette.suspicious.chip} bg-yellow-600`,
  malicious: severityPalette.malicious.chip,
};

const rowSeverityAccent = Object.fromEntries(
  Object.entries(severityPalette).map(([key, value]) => [key, value.row])
);

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

const SortableTable = ({ columns, data, onRowClick, rowClassName }) => {
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
    <div className="overflow-hidden rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <table className="min-w-full table-auto text-xs text-[color:var(--color-text)]">
        <thead className="bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,rgba(15,148,210,0.18))] text-[10px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-terminal-text)_70%,rgba(148,210,255,0.32))]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className="cursor-pointer px-3 py-2 text-left transition hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,rgba(15,148,210,0.2))]"
              >
                {col.label}
                {sort.key === col.key && (
                  <span className="ml-1 text-[9px]">{sort.dir === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-[color:color-mix(in_srgb,var(--kali-panel-border)_55%,transparent)] ${
                rowClassName ? rowClassName(row) : ''
              } ${
                onRowClick
                  ? 'cursor-pointer hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_86%,rgba(15,148,210,0.2))]'
                  : ''
              }`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-3 py-2 whitespace-nowrap text-[11px] text-[color:color-mix(in_srgb,var(--kali-terminal-text)_82%,rgba(148,210,255,0.18))]"
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      <button
        type="button"
        className="text-left text-[11px] text-amber-200 transition hover:text-white"
        onClick={() => {
          setSelectedPid(node.pid);
          setFinding(glossary.pstree);
        }}
      >
        {node.name} ({node.pid})
      </button>
      {node.children && node.children.length > 0 && (
        <ul className="ml-4 space-y-1 border-l border-gray-700 pl-3">
          {node.children.map((child) => (
            <TreeNode key={child.pid} node={child} />
          ))}
        </ul>
      )}
    </li>
  );

  const tabs = [
    'pstree',
    'pslist',
    'netscan',
    'malfind',
    'yarascan',
    'plugins',
    'walkthrough',
  ];

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-2xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_96%,rgba(4,12,20,0.35))] text-white shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,rgba(4,24,36,0.35))] px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold uppercase tracking-wide text-gray-100">
            Volatility analyzer
          </h1>
          <p className="text-xs text-gray-400">
            Review simulated plugin output to triage suspicious activity.
          </p>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-900/60 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-200" aria-hidden="true" />
              Analyzing...
            </>
          ) : (
            <>
              <span aria-hidden="true">▶</span>
              Analyze
            </>
          )}
        </button>
      </div>
      <div className="px-4 pt-2">
        <MemoryHeatmap data={heatmapData} />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4 text-[color:var(--kali-terminal-text)]">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1 overflow-hidden rounded-xl border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] shadow-[0_20px_40px_rgba(5,12,20,0.45)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,rgba(15,148,210,0.16))] px-3 py-2 text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-terminal-text)_70%,rgba(148,210,255,0.28))]">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-3 py-1 transition ${
                    activeTab === tab
                      ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/70'
                      : 'bg-gray-900 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-3 text-xs text-[color:var(--color-text)]">
              {activeTab === 'pstree' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400">{glossary.pstree.description}</p>
                  <div className="flex flex-col gap-4 xl:flex-row">
                    <ul className="space-y-2 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-xs">
                      {pstree.map((node) => (
                        <TreeNode key={node.pid} node={node} />
                      ))}
                    </ul>
                    <div className="flex-1">
                      {selectedPid ? (
                        <div className="space-y-2 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3">
                          <h3 className="text-sm font-semibold text-white">
                            Modules for PID {selectedPid}
                          </h3>
                          <SortableTable
                            columns={[
                              { key: 'base', label: 'Base' },
                              { key: 'name', label: 'Name' },
                            ]}
                            data={dlllist[selectedPid] || []}
                            onRowClick={() => setFinding(glossary.dlllist)}
                          />
                        </div>
                      ) : (
                        <p className="rounded-lg border border-dashed border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_94%,transparent)] p-4 text-[11px] text-gray-400">
                          Select a process to view modules.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'pslist' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400">{glossary.pslist.description}</p>
                  <SortableTable
                    columns={pslistColumns}
                    data={pslist}
                    onRowClick={() => setFinding(glossary.pslist)}
                  />
                </div>
              )}
              {activeTab === 'netscan' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400">{glossary.netscan.description}</p>
                  <SortableTable
                    columns={netscanColumns}
                    data={netscan}
                    onRowClick={() => setFinding(glossary.netscan)}
                    rowClassName={(row) =>
                      rowSeverityAccent[
                        row.state === 'ESTABLISHED' ? 'suspicious' : 'informational'
                      ]
                    }
                  />
                </div>
              )}
              {activeTab === 'malfind' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400">{glossary.malfind.description}</p>
                  <SortableTable
                    columns={[
                      { key: 'pid', label: 'PID' },
                      { key: 'address', label: 'Address' },
                      { key: 'protection', label: 'Protection' },
                      { key: 'description', label: 'Description' },
                    ]}
                    data={malfind}
                    onRowClick={() => setFinding(glossary.malfind)}
                    rowClassName={(row) => {
                      const description = (row.description || '').toLowerCase();
                      const severity = description.includes('inject')
                        ? 'malicious'
                        : 'suspicious';
                      return rowSeverityAccent[severity];
                    }}
                  />
                </div>
              )}
              {activeTab === 'yarascan' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400">{glossary.yara.description}</p>
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
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                heuristicColors[row.heuristic] ?? severityPalette.informational.chip
                              }`}
                          >
                            {row.heuristic}
                          </span>
                        ),
                      },
                    ]}
                    data={yarascan}
                    onRowClick={() => setFinding(glossary.yara)}
                    rowClassName={(row) => rowSeverityAccent[row.heuristic]}
                  />
                </div>
              )}
              {activeTab === 'plugins' && <PluginBrowser />}
              {activeTab === 'walkthrough' && <PluginWalkthrough />}
            </div>
          </div>
          {finding && (
            <aside className="w-full rounded-xl border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-4 text-xs shadow-inner lg:w-72">
              <h3 className="text-sm font-semibold text-white">Explain this finding</h3>
              <p className="mt-2 text-[11px] text-gray-300">{finding.description}</p>
              <a
                href={finding.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-amber-300 underline decoration-dotted underline-offset-2"
              >
                Learn more <span aria-hidden="true">↗</span>
              </a>
              <button
                onClick={() => setFinding(null)}
                className="mt-4 inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200"
              >
                <span aria-hidden="true">✕</span>
                Close
              </button>
            </aside>
          )}
        </div>
      </div>
      {output && (
        <div className="mx-4 mb-4 overflow-auto rounded-xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,rgba(2,20,14,0.35))] text-xs font-mono text-[color:var(--kali-terminal-text)] shadow-inner shadow-[0_0_18px_color-mix(in_srgb,var(--kali-terminal-green)_20%,transparent)]">
          {output.split('\n').map((line, i) => (
            <div
              key={i}
              className={`px-3 py-1 text-[color:var(--kali-terminal-green)] ${
                i % 2
                  ? 'bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,rgba(4,32,24,0.45))]'
                  : 'bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,rgba(2,24,16,0.35))]'
              }`}
            >
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
