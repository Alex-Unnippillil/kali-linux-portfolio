"use client";

import React, { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import cannedResults from '../../../data/network-scanner.json';

type PortRecord = {
  port: number;
  protocol: string;
  state: string;
  service: string;
  banner?: string;
  recommendation?: string;
};

type ScanSummary = {
  open?: number;
  filtered?: number;
  closed?: number;
};

type NetworkScanResult = {
  host: string;
  ip: string;
  scanProfile: string;
  scanTime: string;
  summary?: ScanSummary;
  ports: PortRecord[];
  notes?: string[];
};

type FilterState = 'all' | 'open' | 'filtered' | 'closed';

type NetworkScannerProps = {
  results?: NetworkScanResult[];
};

const fallbackResults = cannedResults as NetworkScanResult[];

const stateStyles: Record<string, string> = {
  open: 'bg-green-500/20 text-green-300',
  filtered: 'bg-yellow-500/20 text-yellow-300',
  closed: 'bg-red-500/20 text-red-300',
};

const filterOptions: { id: FilterState; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'filtered', label: 'Filtered' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

const isToolApisEnabled = () => {
  const flag =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_FEATURE_TOOL_APIS ?? process.env.FEATURE_TOOL_APIS
      : undefined;
  return flag === 'enabled';
};

const formatScanTime = (value: string) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
};

const NetworkScanner: FC<NetworkScannerProps> = ({ results }) => {
  if (!isToolApisEnabled()) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-ub-cool-grey p-6 text-center text-white">
        <h1 className="text-2xl font-semibold">Tool APIs disabled</h1>
        <p className="mt-3 max-w-md text-sm text-ub-light-grey">
          Enable the <code>FEATURE_TOOL_APIS</code> flag to load the network scanner simulation.
        </p>
      </div>
    );
  }

  const dataset = useMemo(
    () => (results && results.length > 0 ? results : fallbackResults),
    [results],
  );

  const [selectedHost, setSelectedHost] = useState(dataset[0]?.host ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<FilterState>('open');

  useEffect(() => {
    if (!dataset.length) {
      setSelectedHost('');
      return;
    }
    if (!selectedHost || !dataset.some((entry) => entry.host === selectedHost)) {
      setSelectedHost(dataset[0].host);
    }
  }, [dataset, selectedHost]);

  useEffect(() => {
    setSearchTerm('');
    setStateFilter('open');
  }, [selectedHost]);

  const activeTarget = useMemo(() => {
    if (!dataset.length) {
      return undefined;
    }
    return dataset.find((entry) => entry.host === selectedHost) ?? dataset[0];
  }, [dataset, selectedHost]);

  const counts = useMemo(() => {
    const base = { open: 0, filtered: 0, closed: 0 };
    if (!activeTarget) {
      return base;
    }
    return activeTarget.ports.reduce(
      (acc, port) => {
        if (port.state === 'open') {
          acc.open += 1;
        } else if (port.state === 'filtered') {
          acc.filtered += 1;
        } else if (port.state === 'closed') {
          acc.closed += 1;
        }
        return acc;
      },
      { ...base },
    );
  }, [activeTarget]);

  const totalPorts = activeTarget?.ports.length ?? 0;

  const filteredPorts = useMemo(() => {
    if (!activeTarget) {
      return [] as PortRecord[];
    }
    const term = searchTerm.trim().toLowerCase();
    return activeTarget.ports.filter((port) => {
      const matchesState = stateFilter === 'all' || port.state === stateFilter;
      const matchesTerm =
        !term ||
        `${port.port}`.includes(term) ||
        port.service.toLowerCase().includes(term) ||
        (port.banner ?? '').toLowerCase().includes(term);
      return matchesState && matchesTerm;
    });
  }, [activeTarget, searchTerm, stateFilter]);

  const summary = {
    open: activeTarget?.summary?.open ?? counts.open,
    filtered: activeTarget?.summary?.filtered ?? counts.filtered,
    closed: activeTarget?.summary?.closed ?? counts.closed,
  };

  const filterCount = (option: FilterState) => {
    if (!activeTarget) {
      return 0;
    }
    if (option === 'open') return counts.open;
    if (option === 'filtered') return counts.filtered;
    if (option === 'closed') return counts.closed;
    return totalPorts;
  };

  const copyToClipboard = async () => {
    if (!activeTarget) return;
    try {
      const payload = JSON.stringify(activeTarget, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const downloadReport = () => {
    if (!activeTarget) return;
    if (typeof document === 'undefined') return;
    try {
      const payload = JSON.stringify(activeTarget, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeTarget.host.replace(/[^a-z0-9-]+/gi, '_')}-scan.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Ignore export issues in unsupported browsers
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 p-4">
        <h1 className="text-2xl font-semibold">Network Scanner Simulation</h1>
        <p className="mt-2 max-w-3xl text-sm text-yellow-300">
          Simulation only: canned results are displayed and no packets are transmitted from this interface.
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {!dataset.length ? (
          <div className="rounded border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-300">
            No scan data available. Provide results to explore the simulation.
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded border border-gray-800 bg-gray-900 p-4">
                <label
                  htmlFor="network-scanner-target"
                  className="text-xs uppercase tracking-wider text-gray-400"
                >
                  Target host
                </label>
                <select
                  id="network-scanner-target"
                  className="mt-2 w-full rounded border border-gray-700 bg-gray-950 p-2 text-sm text-gray-100"
                  value={activeTarget?.host ?? ''}
                  onChange={(event) => setSelectedHost(event.target.value)}
                >
                  {dataset.map((entry) => (
                    <option key={entry.host} value={entry.host}>
                      {entry.host}
                    </option>
                  ))}
                </select>
                <dl className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-400">IP address</dt>
                    <dd className="font-mono">{activeTarget?.ip ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Scan profile</dt>
                    <dd>{activeTarget?.scanProfile ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Last run</dt>
                    <dd>{activeTarget ? formatScanTime(activeTarget.scanTime) : '—'}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded border border-gray-800 bg-gray-900 p-4 md:col-span-2">
                <h2 className="text-sm font-semibold text-gray-200">Port summary</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Open ports', value: summary.open, tone: 'text-green-300' },
                    { label: 'Filtered', value: summary.filtered, tone: 'text-yellow-300' },
                    { label: 'Closed', value: summary.closed, tone: 'text-red-300' },
                  ].map(({ label, value, tone }) => (
                    <div key={label} className="rounded border border-gray-800 bg-gray-950 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
                      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-300">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="rounded border border-gray-700 px-3 py-1 hover:bg-gray-800 focus:outline-none focus:ring focus:ring-ub-yellow/50"
                  >
                    Copy JSON
                  </button>
                  <button
                    type="button"
                    onClick={downloadReport}
                    className="rounded border border-gray-700 px-3 py-1 hover:bg-gray-800 focus:outline-none focus:ring focus:ring-ub-yellow/50"
                  >
                    Download report
                  </button>
                  <span className="ml-auto font-mono text-gray-400">
                    {filteredPorts.length} of {totalPorts} ports shown
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded border border-gray-800 bg-gray-900 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-100">Port findings</h2>
                  <p className="text-xs text-gray-400">
                    Use the filters to explore services discovered during the simulated scan.
                  </p>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setStateFilter(option.id)}
                        className={`rounded px-3 py-1 text-sm transition focus:outline-none focus:ring focus:ring-ub-yellow/50 ${
                          stateFilter === option.id
                            ? 'bg-ub-orange text-black'
                            : 'border border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-800'
                        }`}
                        aria-pressed={stateFilter === option.id}
                      >
                        {`${option.label} (${filterCount(option.id)})`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="network-scanner-search" className="sr-only">
                      Search ports
                    </label>
                    <input
                      id="network-scanner-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search service or port"
                      className="w-full rounded border border-gray-700 bg-gray-950 p-2 text-sm text-gray-100 md:w-64"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800 text-sm">
                  <thead className="bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-400">
                    <tr>
                      <th scope="col" className="px-3 py-2">
                        Port
                      </th>
                      <th scope="col" className="px-3 py-2">
                        State
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Service
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredPorts.map((port) => (
                      <tr key={`${port.port}/${port.protocol}`}>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-100">
                          {port.port}/{port.protocol}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              stateStyles[port.state] ?? 'bg-gray-700 text-gray-200'
                            }`}
                          >
                            {port.state}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-100">{port.service}</td>
                        <td className="px-3 py-2 text-gray-300">
                          <p>{port.banner || '—'}</p>
                          {port.recommendation && (
                            <p className="mt-1 text-xs text-ub-light-grey">{port.recommendation}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPorts.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-400">
                    No ports match the selected filters.
                  </p>
                )}
              </div>
            </section>

            {activeTarget?.notes?.length ? (
              <section className="rounded border border-gray-800 bg-gray-900 p-4">
                <h2 className="text-lg font-semibold text-gray-100">Investigation notes</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-300">
                  {activeTarget.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default NetworkScanner;

