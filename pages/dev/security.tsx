import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ReportSource = 'report-to' | 'report-uri' | 'unknown';

interface StoredReport {
  id: string;
  receivedAt: string;
  source: ReportSource;
  type: string | null;
  url: string | null;
  violatedDirective: string | null;
  blockedURL: string | null;
  originalPolicy: string | null;
  disposition: string | null;
  referrer: string | null;
  userAgent: string | null;
  body: unknown;
}

const POLL_INTERVAL_MS = 5000;

export default function SecurityReportingDashboard() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | ReportSource>('all');
  const [directiveFilter, setDirectiveFilter] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const isMounted = useRef(true);

  const fetchReports = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/reporting/csp');
      if (!response.ok) {
        throw new Error(`Failed to load reports (${response.status})`);
      }
      const payload = await response.json();
      const incoming: StoredReport[] = Array.isArray(payload?.reports) ? payload.reports : [];
      if (!isMounted.current) {
        return;
      }
      setReports(incoming);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (error: unknown) {
      if (!isMounted.current) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Unable to load reports';
      setError(message);
    } finally {
      if (isMounted.current) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchReports();
    const interval = window.setInterval(fetchReports, POLL_INTERVAL_MS);
    return () => {
      isMounted.current = false;
      window.clearInterval(interval);
    };
  }, [fetchReports]);

  const directiveOptions = useMemo(() => {
    const values = new Set<string>();
    reports.forEach((report) => {
      if (report.violatedDirective) {
        values.add(report.violatedDirective);
      }
    });
    return Array.from(values).sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return reports.filter((report) => {
      if (sourceFilter !== 'all' && report.source !== sourceFilter) {
        return false;
      }
      if (directiveFilter !== 'all' && report.violatedDirective !== directiveFilter) {
        return false;
      }
      if (normalizedSearch) {
        const haystacks = [
          report.url,
          report.blockedURL,
          report.violatedDirective,
          report.originalPolicy,
          report.userAgent,
          report.referrer,
        ];
        const matches = haystacks.some((value) =>
          typeof value === 'string' ? value.toLowerCase().includes(normalizedSearch) : false
        );
        if (!matches) {
          return false;
        }
      }
      return true;
    });
  }, [reports, sourceFilter, directiveFilter, searchTerm]);

  const directiveCounts = useMemo(() => {
    const tally = new Map<string, number>();
    filteredReports.forEach((report) => {
      const key = report.violatedDirective || 'unknown-directive';
      tally.set(key, (tally.get(key) ?? 0) + 1);
    });
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredReports]);

  const sourceCounts = useMemo(() => {
    const tally: Map<ReportSource, number> = new Map([
      ['report-to', 0],
      ['report-uri', 0],
      ['unknown', 0],
    ]);
    reports.forEach((report) => {
      tally.set(report.source, (tally.get(report.source) ?? 0) + 1);
    });
    return tally;
  }, [reports]);

  const resetFilters = () => {
    setSourceFilter('all');
    setDirectiveFilter('all');
    setSearchTerm('');
  };

  const clearReports = useCallback(async () => {
    try {
      const response = await fetch('/api/reporting/csp', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to clear reports (${response.status})`);
      }
      if (isMounted.current) {
        setReports([]);
        setLastUpdated(new Date().toISOString());
        setError(null);
      }
    } catch (error: unknown) {
      if (isMounted.current) {
        const message = error instanceof Error ? error.message : 'Unable to clear reports';
        setError(message);
      }
    }
  }, []);

  const lastUpdatedLabel = lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never';

  return (
    <>
      <Head>
        <title>Security reporting dashboard</title>
      </Head>
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Content Security Policy reports</h1>
          <p className="text-sm text-slate-500">
            This developer dashboard collects CSP violation payloads sent via <code>Report-To</code> and{' '}
            <code>report-uri</code> directives. Trigger a policy violation in another tab to populate the feed below.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Stored reports</p>
            <p className="mt-1 text-2xl font-semibold">{reports.length}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Visible after filters</p>
            <p className="mt-1 text-2xl font-semibold">{filteredReports.length}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Unique directives</p>
            <p className="mt-1 text-2xl font-semibold">{directiveCounts.length}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Last refresh</p>
            <p className="mt-1 text-base font-medium">{lastUpdatedLabel}</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Source</span>
              <select
                className="rounded border border-slate-200 p-2"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as 'all' | ReportSource)}
              >
                <option value="all">All sources</option>
                <option value="report-to">Report-To</option>
                <option value="report-uri">Report-URI</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Directive</span>
              <select
                className="rounded border border-slate-200 p-2"
                value={directiveFilter}
                onChange={(event) => setDirectiveFilter(event.target.value)}
              >
                <option value="all">All directives</option>
                {directiveOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Search</span>
              <input
                className="rounded border border-slate-200 p-2"
                placeholder="URL, directive, user agent"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded border border-slate-200 px-3 py-2 text-sm font-medium"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={fetchReports}
              className="rounded border border-slate-200 px-3 py-2 text-sm font-medium"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={clearReports}
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            >
              Clear stored reports
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {isFetching && <p className="text-xs text-slate-500">Refreshing…</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Violation counts by directive</h2>
          {directiveCounts.length === 0 ? (
            <p className="text-sm text-slate-500">No reports have been recorded with the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 font-medium text-slate-600">Directive</th>
                    <th className="px-3 py-2 font-medium text-slate-600">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {directiveCounts.map(([directive, count]) => (
                    <tr key={directive}>
                      <td className="px-3 py-2 text-sm font-medium text-slate-700">{directive}</td>
                      <td className="px-3 py-2 text-sm text-slate-600">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Stored reports</h2>
            <div className="flex gap-3 text-xs text-slate-500">
              <span>Report-To: {sourceCounts.get('report-to') ?? 0}</span>
              <span>Report-URI: {sourceCounts.get('report-uri') ?? 0}</span>
              <span>Unknown: {sourceCounts.get('unknown') ?? 0}</span>
            </div>
          </div>
          {filteredReports.length === 0 ? (
            <p className="text-sm text-slate-500">No stored reports match the current filters.</p>
          ) : (
            <ul className="space-y-4">
              {filteredReports.map((report) => (
                <li key={report.id} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">
                      {report.source}
                    </span>
                    <span>Received {new Date(report.receivedAt).toLocaleString()}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-slate-600">Directive</dt>
                      <dd className="text-slate-800">{report.violatedDirective ?? 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-600">Disposition</dt>
                      <dd className="text-slate-800">{report.disposition ?? 'n/a'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-slate-600">Document URL</dt>
                      <dd className="break-all text-slate-800">{report.url ?? 'n/a'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-slate-600">Blocked resource</dt>
                      <dd className="break-all text-slate-800">{report.blockedURL ?? 'n/a'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-slate-600">Original policy</dt>
                      <dd className="break-words text-slate-800">{report.originalPolicy ?? 'n/a'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-slate-600">User agent</dt>
                      <dd className="break-words text-slate-800">{report.userAgent ?? 'n/a'}</dd>
                    </div>
                    {report.referrer && (
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-slate-600">Referrer</dt>
                        <dd className="break-all text-slate-800">{report.referrer}</dd>
                      </div>
                    )}
                  </dl>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-slate-600">Show raw payload</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                      {JSON.stringify(report.body, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
