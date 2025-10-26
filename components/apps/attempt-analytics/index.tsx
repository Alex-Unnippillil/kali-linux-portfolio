'use client';

import React, { useMemo, useState } from 'react';
import VirtualList from 'rc-virtual-list';
import runsData from '@/data/attempt-analytics.json';
import {
  buildAggregations,
  buildChartSeries,
  createFilterOptions,
  diffAttemptRuns,
  ensureValidSelections,
  estimateVirtualizedFrameCost,
  filterAttempts,
  flattenRuns,
  sanitizeAttemptsForExport,
  type AttemptRun,
  type AttemptStatus,
  type FlattenedAttempt,
} from '@/utils/attemptAnalytics';

const LIST_HEIGHT = 432;
const ITEM_HEIGHT = 72;
const OVERSCAN = 4;

const statusPalette: Record<AttemptStatus, string> = {
  success: 'text-emerald-300',
  blocked: 'text-rose-300',
  detected: 'text-amber-300',
  deferred: 'text-sky-300',
};

const formatNumber = (value: number) => value.toLocaleString('en-US');

const AttemptAnalyticsApp: React.FC = () => {
  const runs = runsData as AttemptRun[];
  const attempts = useMemo(() => flattenRuns(runs), [runs]);
  const filterOptions = useMemo(() => createFilterOptions(attempts), [attempts]);

  const [activeProtocols, setActiveProtocols] = useState<string[]>(filterOptions.protocols);
  const [activeStatuses, setActiveStatuses] = useState<AttemptStatus[]>(filterOptions.statuses);
  const [selectedRuns, setSelectedRuns] = useState<string[]>(filterOptions.runIds);
  const [search, setSearch] = useState('');

  const baselineDefault = runs.find((run) => run.baseline)?.runId ?? runs[0]?.runId ?? '';
  const comparisonDefault = runs.find((run) => run.runId !== baselineDefault)?.runId ?? baselineDefault;

  const [baselineId, setBaselineId] = useState<string>(baselineDefault);
  const [comparisonId, setComparisonId] = useState<string>(comparisonDefault);

  const filters = useMemo(
    () => ({
      statuses: activeStatuses,
      protocols: activeProtocols,
      runIds: ensureValidSelections(selectedRuns, filterOptions.runIds),
      search,
    }),
    [activeStatuses, activeProtocols, selectedRuns, search, filterOptions.runIds],
  );

  const filteredAttempts = useMemo(
    () => filterAttempts(attempts, filters),
    [attempts, filters],
  );

  const aggregations = useMemo(() => buildAggregations(filteredAttempts), [filteredAttempts]);
  const chartSeries = useMemo(() => buildChartSeries(aggregations), [aggregations]);

  const successCount = filteredAttempts.filter((attempt) => attempt.status === 'success').length;
  const successRate = filteredAttempts.length
    ? (successCount / filteredAttempts.length) * 100
    : 0;
  const uniqueTargets = new Set(filteredAttempts.map((attempt) => attempt.target)).size;
  const meanDuration = filteredAttempts.length
    ? filteredAttempts.reduce((total, attempt) => total + attempt.durationMs, 0) /
      filteredAttempts.length
    : 0;

  const frameBudget = estimateVirtualizedFrameCost({
    viewportHeight: LIST_HEIGHT,
    itemHeight: ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  const baselineRun = runs.find((run) => run.runId === baselineId);
  const comparisonRun = runs.find((run) => run.runId === comparisonId);
  const diff = useMemo(
    () => (baselineRun && comparisonRun ? diffAttemptRuns(baselineRun, comparisonRun) : null),
    [baselineRun, comparisonRun],
  );

  const toggleProtocol = (protocol: string) => {
    setActiveProtocols((prev) =>
      prev.includes(protocol) ? prev.filter((item) => item !== protocol) : [...prev, protocol],
    );
  };

  const toggleStatus = (status: AttemptStatus) => {
    setActiveStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  };

  const toggleRun = (runId: string) => {
    setSelectedRuns((prev) => {
      const next = prev.includes(runId)
        ? prev.filter((item) => item !== runId)
        : [...prev, runId];
      return ensureValidSelections(next, filterOptions.runIds);
    });
  };

  const exportData = () => {
    if (typeof window === 'undefined') return;
    const sanitized = sanitizeAttemptsForExport(filteredAttempts);
    const payload = {
      generatedAt: new Date().toISOString(),
      appliedFilters: filters,
      totals: {
        attempts: sanitized.length,
        uniqueTargets: new Set(sanitized.map((attempt) => attempt.target)).size,
      },
      attempts: sanitized,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attempt-analytics-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderAttemptRow = (attempt: FlattenedAttempt) => (
    <div
      key={attempt.id}
      className="flex flex-col gap-1 rounded border border-gray-800 bg-[var(--kali-panel)] p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{attempt.target}</span>
        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide">
          {attempt.protocol}
        </span>
        <span className={`text-xs font-medium ${statusPalette[attempt.status]}`}>
          {attempt.status}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {new Date(attempt.timestamp).toLocaleString()}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
        <span>{attempt.detection}</span>
        <span>·</span>
        <span>{attempt.runLabel}</span>
        <span>·</span>
        <span>{attempt.operatorAlias}</span>
        <span className="ml-auto">{attempt.durationMs.toFixed(0)} ms</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-[var(--kali-bg)] text-white">
      <header className="border-b border-gray-800 bg-[var(--kali-panel)] p-4">
        <h1 className="text-2xl font-semibold">Attempt Analytics</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-300">
          Aggregate simulated intrusion attempts by target, protocol, and status to explain how
          defenders improved controls between exercises. Use the filters to narrow the dataset,
          compare lab runs, and export only privacy-reviewed records for lesson plans.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded border border-gray-700 bg-gray-900/40 p-3">
            <p className="text-xs uppercase text-gray-400">Attempts</p>
            <p className="text-lg font-semibold">{formatNumber(filteredAttempts.length)}</p>
          </div>
          <div className="rounded border border-gray-700 bg-gray-900/40 p-3">
            <p className="text-xs uppercase text-gray-400">Success rate</p>
            <p className="text-lg font-semibold">{successRate.toFixed(1)}%</p>
          </div>
          <div className="rounded border border-gray-700 bg-gray-900/40 p-3">
            <p className="text-xs uppercase text-gray-400">Distinct targets</p>
            <p className="text-lg font-semibold">{uniqueTargets}</p>
          </div>
          <div className="rounded border border-gray-700 bg-gray-900/40 p-3">
            <p className="text-xs uppercase text-gray-400">Avg. duration</p>
            <p className="text-lg font-semibold">{meanDuration.toFixed(0)} ms</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded border border-gray-800 bg-gray-900/40 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="block text-xs uppercase text-gray-400" htmlFor="attempt-search">
                  Search
                </label>
                <input
                  id="attempt-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find by target, run, protocol, or analyst"
                  aria-label="Search attempts"
                  className="mt-1 w-full rounded border border-gray-700 bg-[var(--kali-bg)] p-2 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 text-sm">
                <div className="flex flex-col">
                  <label className="text-xs uppercase text-gray-400" htmlFor="baseline-select">
                    Baseline run
                  </label>
                  <select
                    id="baseline-select"
                    value={baselineId}
                    onChange={(event) => setBaselineId(event.target.value)}
                    className="mt-1 rounded border border-gray-700 bg-[var(--kali-bg)] p-2"
                  >
                    {runs.map((run) => (
                      <option key={run.runId} value={run.runId}>
                        {run.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs uppercase text-gray-400" htmlFor="comparison-select">
                    Comparison run
                  </label>
                  <select
                    id="comparison-select"
                    value={comparisonId}
                    onChange={(event) => setComparisonId(event.target.value)}
                    className="mt-1 rounded border border-gray-700 bg-[var(--kali-bg)] p-2"
                  >
                    {runs.map((run) => (
                      <option key={run.runId} value={run.runId}>
                        {run.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>
                Frame budget ≈ {frameBudget.toFixed(1)} ms (target &lt; 16 ms) with overscan {OVERSCAN}
              </span>
              <button
                type="button"
                onClick={exportData}
                className="ml-auto rounded border border-sky-500 px-3 py-1 text-sm text-sky-300 hover:bg-sky-500/20"
              >
                Export filtered (privacy-safe)
              </button>
            </div>
            <div style={{ minHeight: `${LIST_HEIGHT}px` }}>
              {filteredAttempts.length === 0 ? (
                <p className="rounded border border-gray-800 bg-gray-900/60 p-6 text-center text-sm text-gray-400">
                  No attempts match the current filters.
                </p>
              ) : (
                <VirtualList
                  data={filteredAttempts}
                  height={LIST_HEIGHT}
                  itemHeight={ITEM_HEIGHT}
                  itemKey="id"
                  overscan={OVERSCAN}
                  className="flex flex-col gap-2"
                >
                  {(attempt: FlattenedAttempt) => renderAttemptRow(attempt)}
                </VirtualList>
              )}
            </div>
          </div>

          {diff && (
            <div className="rounded border border-gray-800 bg-gray-900/40 p-4">
              <h2 className="text-lg font-semibold">Run comparison</h2>
              <p className="mt-1 text-sm text-gray-300">
                Contrast {diff.baseline.label} with {diff.comparison.label} to highlight how controls shifted
                between simulations.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <h3 className="text-xs uppercase text-gray-400">Status delta</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {Object.entries(diff.delta.status).map(([label, value]) => (
                      <li key={label} className="flex justify-between text-gray-300">
                        <span>{label}</span>
                        <span className={value >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {value >= 0 ? '+' : ''}{value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-gray-400">Protocol delta</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {Object.entries(diff.delta.protocol).map(([label, value]) => (
                      <li key={label} className="flex justify-between text-gray-300">
                        <span>{label}</span>
                        <span className={value >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {value >= 0 ? '+' : ''}{value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-gray-400">Success rate</h3>
                  <p className="mt-2 text-2xl font-semibold text-emerald-300">
                    {diff.delta.successRate >= 0 ? '+' : ''}{diff.delta.successRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    Attempts delta: {diff.delta.attempts >= 0 ? '+' : ''}
                    {diff.delta.attempts}
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded border border-gray-800 bg-black/40 p-3 text-xs">
                {diff.diff.map((part, index) => (
                  <span
                    key={`${index}-${part.value}`}
                    className={
                      part.added
                        ? 'bg-emerald-900/60'
                        : part.removed
                          ? 'bg-rose-900/60 line-through'
                          : ''
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="flex w-full max-w-md flex-col gap-4 lg:max-w-sm">
          <div className="rounded border border-gray-800 bg-gray-900/40 p-4">
            <h2 className="text-lg font-semibold">Run filters</h2>
            <div className="mt-2 space-y-2 text-sm">
              {runs.map((run) => {
                const checked = selectedRuns.includes(run.runId);
                return (
                  <label key={run.runId} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRun(run.runId)}
                      aria-label={`Include ${run.label}`}
                      className="mt-1 rounded border-gray-600 bg-[var(--kali-bg)]"
                    />
                    <span>
                      <span className="block font-medium">{run.label}</span>
                      <span className="block text-xs text-gray-400">{run.scenario}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded border border-gray-800 bg-gray-900/40 p-4">
            <h2 className="text-lg font-semibold">Status filters</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {filterOptions.statuses.map((status) => {
                const checked = activeStatuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    className={`rounded px-3 py-1 text-sm transition ${
                      checked
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-500'
                        : 'border border-gray-700 text-gray-300'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded border border-gray-800 bg-gray-900/40 p-4">
            <h2 className="text-lg font-semibold">Protocol filters</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {filterOptions.protocols.map((protocol) => {
                const checked = activeProtocols.includes(protocol);
                return (
                  <button
                    key={protocol}
                    type="button"
                    onClick={() => toggleProtocol(protocol)}
                    className={`rounded px-3 py-1 text-sm transition ${
                      checked
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500'
                        : 'border border-gray-700 text-gray-300'
                    }`}
                  >
                    {protocol}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <ChartCard title="Attempts by status" series={chartSeries.status} />
            <ChartCard title="Attempts by protocol" series={chartSeries.protocol} />
            <ChartCard title="Attempts by target" series={chartSeries.target} />
          </div>
        </aside>
      </div>
    </div>
  );
};

interface ChartCardProps {
  title: string;
  series: { label: string; value: number }[];
}

const ChartCard: React.FC<ChartCardProps> = ({ title, series }) => {
  const max = series.reduce((peak, item) => Math.max(peak, item.value), 0) || 1;
  return (
    <div className="rounded border border-gray-800 bg-gray-900/40 p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">
        {series.length === 0 && (
          <p className="text-sm text-gray-400">No data in view.</p>
        )}
        {series.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="mt-1 h-2 rounded bg-gray-800">
              <div
                className="h-2 rounded bg-sky-500"
                style={{ width: `${(item.value / max) * 100}%` }}
                role="presentation"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttemptAnalyticsApp;
