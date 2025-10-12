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

const severityStyles = {
  informational: {
    badge:
      'border border-[color:var(--color-info-border)] bg-[color:var(--color-info-surface)] text-[color:var(--color-info)] shadow-[0_0_14px_var(--color-info-glow)]',
    row: '',
  },
  suspicious: {
    badge:
      'border border-[color:var(--color-warn-border)] bg-[color:var(--color-warn-surface)] text-[color:var(--color-warn)] shadow-[0_0_16px_var(--color-warn-glow)]',
    row: 'border-l-4 border-[color:var(--color-warn-border)] bg-[color:var(--color-warn-surface)] shadow-[inset_0_0_20px_var(--color-warn-glow)]',
  },
  malicious: {
    badge:
      'border border-[color:var(--color-error-border)] bg-[color:var(--color-error-surface)] text-[color:var(--color-error)] shadow-[0_0_18px_var(--color-error-glow)]',
    row: 'border-l-4 border-[color:var(--color-error-border)] bg-[color:var(--color-error-surface)] shadow-[inset_0_0_22px_var(--color-error-glow)]',
  },
};

const getSeverityBadgeClass = (severity) =>
  severityStyles[severity]?.badge ||
  'border border-[color:var(--color-border)] bg-kali-surface-subtle text-[color:var(--color-text)]';

const getSeverityRowClass = (severity) => severityStyles[severity]?.row || '';

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
    <div className="overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-kali-surface-raised shadow-[inset_0_1px_0_color-mix(in_srgb,_var(--color-border)_45%,_transparent)]">
      <table className="min-w-full table-auto text-xs text-[color:var(--color-text)]">
        <thead className="bg-kali-surface-strong text-[10px] uppercase tracking-wide text-[color:color-mix(in_srgb,_var(--color-text)_62%,_transparent)]">
          <tr>
            {columns.map((col) => {
              const isSorted = sort.key === col.key;
              const sortDirection = isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th key={col.key} scope="col" aria-sort={sortDirection} className="px-0">
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="flex w-full items-center justify-start gap-1 rounded-md px-3 py-2 text-left transition hover:bg-kali-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)]"
                  >
                    {col.label}
                    {isSorted && (
                      <span className="text-[9px]" aria-hidden="true">
                        {sort.dir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const interactive = Boolean(onRowClick);
            return (
              <tr
                key={i}
                className={`border-b border-[color:color-mix(in_srgb,_var(--color-border)_60%,_transparent)] ${
                  rowClassName ? rowClassName(row) : ''
                } ${
                  interactive
                    ? 'cursor-pointer hover:bg-kali-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)]'
                    : ''
                }`}
                onClick={() => onRowClick && onRowClick(row)}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onKeyDown={(event) => {
                  if (!interactive) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-3 py-2 text-[11px]">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
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
        className="text-left text-[11px] text-[color:var(--color-info)] transition hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)]"
        onClick={() => {
          setSelectedPid(node.pid);
          setFinding(glossary.pstree);
        }}
      >
        {node.name} ({node.pid})
      </button>
      {node.children && node.children.length > 0 && (
        <ul className="ml-4 space-y-1 border-l border-[color:var(--color-border)] pl-3">
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
    <div className="flex h-full w-full flex-col gap-4 rounded-2xl border border-[color:var(--color-border)] bg-kali-surface-strong text-[color:var(--color-text)] shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-kali-surface-raised px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold uppercase tracking-wide text-[color:var(--color-text)]">
            Volatility analyzer
          </h1>
          <p className="text-xs text-[color:color-mix(in_srgb,_var(--color-text)_68%,_transparent)]">
            Review simulated plugin output to triage suspicious activity.
          </p>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-info-border)] bg-[color:var(--color-info-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--color-info)] shadow-[0_0_18px_var(--color-info-glow)] transition hover:border-[color:var(--color-info)] hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-2 w-2 animate-ping rounded-full bg-[color:var(--color-info)]" aria-hidden="true" />
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
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1 overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-kali-surface-raised">
            <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--color-border)] bg-kali-surface-strong px-3 py-2 text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,_var(--color-text)_60%,_transparent)]">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-3 py-1 text-[11px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)] ${
                    activeTab === tab
                      ? 'bg-[color:var(--color-info-surface)] text-[color:var(--color-info)] ring-1 ring-[color:var(--color-info-border)] shadow-[0_0_12px_var(--color-info-glow)]'
                      : 'bg-kali-surface-subtle text-[color:color-mix(in_srgb,_var(--color-text)_60%,_transparent)] hover:text-[color:var(--color-text)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-3 text-xs text-[color:var(--color-text)]">
              {activeTab === 'pstree' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[color:color-mix(in_srgb,_var(--color-text)_62%,_transparent)]">{glossary.pstree.description}</p>
                  <div className="flex flex-col gap-4 xl:flex-row">
                    <ul className="space-y-2 rounded-lg border border-[color:var(--color-border)] bg-kali-surface-subtle p-3 text-xs">
                      {pstree.map((node) => (
                        <TreeNode key={node.pid} node={node} />
                      ))}
                    </ul>
                    <div className="flex-1">
                      {selectedPid ? (
                        <div className="space-y-2 rounded-lg border border-[color:var(--color-border)] bg-kali-surface-subtle p-3">
                          <h3 className="text-sm font-semibold text-[color:var(--color-text)]">
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
                        <p className="rounded-lg border border-dashed border-[color:var(--color-border)] bg-kali-surface-subtle p-4 text-[11px] text-[color:color-mix(in_srgb,_var(--color-text)_62%,_transparent)]">
                          Select a process to view modules.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'pslist' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[color:color-mix(in_srgb,_var(--color-text)_62%,_transparent)]">{glossary.pslist.description}</p>
                  <SortableTable
                    columns={pslistColumns}
                    data={pslist}
                    onRowClick={() => setFinding(glossary.pslist)}
                  />
                </div>
              )}
              {activeTab === 'netscan' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[color:color-mix(in_srgb,_var(--color-text)_62%,_transparent)]">{glossary.netscan.description}</p>
                  <SortableTable
                    columns={netscanColumns}
                    data={netscan}
                    onRowClick={() => setFinding(glossary.netscan)}
                    rowClassName={(row) =>
                      getSeverityRowClass(
                        row.state === 'ESTABLISHED' ? 'suspicious' : 'informational'
                      )
                    }
                  />
                </div>
              )}
              {activeTab === 'malfind' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[color:color-mix(in_srgb,_var(--color-text)_62%,_transparent)]">{glossary.malfind.description}</p>
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
                      return getSeverityRowClass(severity);
                    }}
                  />
                </div>
              )}
              {activeTab === 'yarascan' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[color:color-mix(in_srgb,_var(--color-text)_62%,_transparent)]">{glossary.yara.description}</p>
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
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize shadow transition ${
                              getSeverityBadgeClass(row.heuristic)
                            }`}
                          >
                            {row.heuristic}
                          </span>
                        ),
                      },
                    ]}
                    data={yarascan}
                    onRowClick={() => setFinding(glossary.yara)}
                    rowClassName={(row) => getSeverityRowClass(row.heuristic)}
                  />
                </div>
              )}
              {activeTab === 'plugins' && <PluginBrowser />}
              {activeTab === 'walkthrough' && <PluginWalkthrough />}
            </div>
          </div>
          {finding && (
            <aside className="w-full rounded-xl border border-[color:var(--color-border)] bg-kali-surface-raised p-4 text-xs shadow-inner lg:w-72">
              <h3 className="text-sm font-semibold text-[color:var(--color-text)]">Explain this finding</h3>
              <p className="mt-2 text-[11px] text-[color:color-mix(in_srgb,_var(--color-text)_70%,_transparent)]">{finding.description}</p>
              <a
                href={finding.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-[color:var(--color-info)] underline decoration-dotted underline-offset-2 transition hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)]"
              >
                Learn more <span aria-hidden="true">↗</span>
              </a>
              <button
                onClick={() => setFinding(null)}
                className="mt-4 inline-flex items-center gap-1 text-[11px] text-[color:var(--color-error)] transition hover:text-[color:var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-outline-color)]"
              >
                <span aria-hidden="true">✕</span>
                Close
              </button>
            </aside>
          )}
        </div>
      </div>
      {output && (
        <div className="mx-4 mb-4 overflow-auto rounded-xl border border-[color:var(--color-border)] bg-kali-surface-raised text-xs font-mono text-[color:var(--color-text)] shadow-inner">
          {output.split('\n').map((line, i) => (
            <div
              key={i}
              className={`px-3 py-1 ${i % 2 ? 'bg-kali-surface-strong' : 'bg-kali-surface-subtle'}`}
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
