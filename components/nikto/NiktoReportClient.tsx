'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { NiktoFinding, NiktoReportPayload } from '../../lib/reports/nikto';
import { NIKTO_SEVERITY_COLORS } from './constants';

interface NiktoReportClientProps {
  initialData: NiktoReportPayload & {
    availableSeverities: string[];
    timings?: { serverMs?: number };
  };
}

interface FiltersState {
  severity: string;
  path: string;
}

interface TimingsState {
  serverMs?: number;
}

const FETCH_DEBOUNCE = 250;

const EXPORT_HEADERS = ['Path', 'Finding', 'Severity', 'References', 'Details'] as const;

const serializeCsv = (rows: NiktoFinding[]) => {
  const header = EXPORT_HEADERS.join(',');
  const body = rows
    .map((row) => {
      const values = [
        row.path,
        row.finding,
        row.severity,
        row.references.join('; '),
        row.details,
      ];
      return values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',');
    })
    .join('\n');
  return `${header}\n${body}`;
};

const createParams = (filters: FiltersState) => {
  const params = new URLSearchParams();
  if (filters.severity && filters.severity !== 'All') {
    params.set('severity', filters.severity);
  }
  if (filters.path.trim()) {
    params.set('path', filters.path.trim());
  }
  return params.toString();
};

const matchKey = (finding: NiktoFinding) => `${finding.path}::${finding.finding}`;

const NiktoReportClient = ({ initialData }: NiktoReportClientProps) => {
  const [filters, setFilters] = useState<FiltersState>({
    severity: initialData.filters.severity ?? 'All',
    path: initialData.filters.path ?? '',
  });
  const [pathInput, setPathInput] = useState(initialData.filters.path ?? '');
  const [findings, setFindings] = useState<NiktoFinding[]>(initialData.findings);
  const [selected, setSelected] = useState<NiktoFinding | null>(null);
  const [severities, setSeverities] = useState<string[]>(initialData.availableSeverities);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timings, setTimings] = useState<TimingsState>(initialData.timings ?? {});
  const [lastFetchMs, setLastFetchMs] = useState<number | null>(null);
  const [hydrationMs, setHydrationMs] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState<number>(initialData.matchCount);

  const firstUpdateRef = useRef(true);

  useEffect(() => {
    const perf = typeof performance !== 'undefined' ? performance : undefined;
    if (!perf || typeof perf.now !== 'function') return;

    const entries =
      typeof perf.getEntriesByType === 'function'
        ? perf.getEntriesByType('navigation')
        : [];
    const navEntry = entries[0] as
      | PerformanceNavigationTiming
      | undefined;
    const baseline = navEntry?.startTime ?? 0;
    const hydrated = perf.now() - baseline;
    setHydrationMs(hydrated);
    console.info(`[NiktoReport] hydrated in ${hydrated.toFixed(1)}ms`);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((prev) => {
        if (prev.path === pathInput) return prev;
        return { ...prev, path: pathInput };
      });
    }, FETCH_DEBOUNCE);
    return () => window.clearTimeout(handle);
  }, [pathInput]);

  useEffect(() => {
    if (firstUpdateRef.current) {
      firstUpdateRef.current = false;
      return;
    }

    const controller = new AbortController();
    const supportsPerfNow =
      typeof performance !== 'undefined' && typeof performance.now === 'function';
    const startedAt = supportsPerfNow ? performance.now() : 0;
    setLoading(true);
    setError(null);

    const query = createParams(filters);
    const url = query ? `/api/reports/nikto?${query}` : '/api/reports/nikto';

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load report');
        return res.json();
      })
      .then((payload) => {
        setFindings(payload.findings ?? []);
        setMatchCount(payload.matchCount ?? (payload.findings?.length ?? 0));
        if (payload.availableSeverities) {
          setSeverities(payload.availableSeverities);
        }
        setTimings(payload.timings ?? {});
        setSelected((prev) => {
          if (!prev) return null;
          const next = (payload.findings ?? []).find(
            (finding: NiktoFinding) => matchKey(finding) === matchKey(prev),
          );
          return next ?? null;
        });
        if (supportsPerfNow) {
          setLastFetchMs(performance.now() - startedAt);
        } else {
          setLastFetchMs(null);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError('Unable to load filtered results.');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    if (!selected) return;
    const exists = findings.some((finding) => matchKey(finding) === matchKey(selected));
    if (!exists) setSelected(null);
  }, [findings, selected]);

  const exportJson = () => {
    if (!findings.length) return;
    const blob = new Blob([JSON.stringify(findings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nikto-findings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (!findings.length) return;
    const csv = serializeCsv(findings);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nikto-findings.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const severityOptions = useMemo(() => severities ?? ['All', 'High', 'Medium', 'Low', 'Info'], [
    severities,
  ]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs" htmlFor="nikto-path-filter">
          Path prefix
          <input
            id="nikto-path-filter"
            className="mt-1 rounded border border-gray-600 bg-gray-800 p-2 text-sm text-white"
            placeholder="Filter by path"
            value={pathInput}
            onChange={(event) => setPathInput(event.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs" htmlFor="nikto-severity-filter">
          Severity
          <select
            id="nikto-severity-filter"
            className="mt-1 rounded border border-gray-600 bg-gray-800 p-2 text-sm text-white"
            value={filters.severity}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, severity: event.target.value }))
            }
          >
            {severityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-2 text-sm"
            onClick={exportJson}
            disabled={!findings.length}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-2 text-sm"
            onClick={exportCsv}
            disabled={!findings.length}
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        <span>Matches: {matchCount}</span>
        {hydrationMs !== null && (
          <span className="ml-2">Hydration: {hydrationMs.toFixed(1)}ms</span>
        )}
        {lastFetchMs !== null && (
          <span className="ml-2">
            Last fetch: {lastFetchMs.toFixed(1)}ms
            {timings.serverMs !== undefined
              ? ` (server ${timings.serverMs.toFixed(1)}ms)`
              : ''}
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="overflow-hidden rounded border border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800 text-xs uppercase tracking-wide text-gray-300">
            <tr>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Finding</th>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">References</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => {
              const isSelected = selected ? matchKey(selected) === matchKey(finding) : false;
              return (
                <tr
                  key={matchKey(finding)}
                  className={`cursor-pointer border-l-4 transition hover:bg-gray-800 ${
                    isSelected ? 'bg-gray-800/60' : ''
                  }`}
                  style={{
                    borderColor:
                      NIKTO_SEVERITY_COLORS[finding.severity] ?? NIKTO_SEVERITY_COLORS.Info,
                  }}
                  onClick={() => setSelected(finding)}
                >
                  <td className="px-3 py-2 font-mono text-xs">{finding.path}</td>
                  <td className="px-3 py-2">{finding.finding}</td>
                  <td className="px-3 py-2">{finding.severity}</td>
                  <td className="px-3 py-2 text-xs">
                    {finding.references.length ? finding.references.join(', ') : '—'}
                  </td>
                </tr>
              );
            })}
            {!findings.length && !loading && (
              <tr>
                <td className="px-3 py-4 text-center text-sm text-gray-400" colSpan={4}>
                  No findings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && (
          <div className="bg-gray-900/80 p-3 text-sm text-gray-300" role="status">
            Loading filtered results…
          </div>
        )}
      </div>
      {selected && (
        <div className="rounded border border-gray-700 bg-gray-800 p-3 text-sm">
          <h2 className="text-lg font-semibold">{selected.finding}</h2>
          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex gap-2">
              <dt className="font-semibold">Path:</dt>
              <dd className="font-mono">{selected.path}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">Severity:</dt>
              <dd>{selected.severity}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-semibold">References:</dt>
              <dd>{selected.references.length ? selected.references.join(', ') : 'None'}</dd>
            </div>
          </dl>
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-200">{selected.details}</p>
        </div>
      )}
    </section>
  );
};

export default NiktoReportClient;
