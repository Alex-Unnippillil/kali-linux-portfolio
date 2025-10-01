import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { List, ListChildComponentProps } from 'react-window';

export interface TrendService {
  port: number;
  service: string;
  state?: 'open' | 'closed' | 'filtered';
  latencyMs?: number;
}

export interface TrendHost {
  host: string;
  hostname?: string;
  services: TrendService[];
}

export interface TrendRun {
  id: string;
  label?: string;
  startedAt: string;
  hosts: TrendHost[];
}

type TrendValue = {
  value: number | null;
  state: TrendService['state'] | null;
};

type AggregatedEntry = {
  key: string;
  host: string;
  hostname?: string;
  service: string;
  port: number;
  values: TrendValue[];
};

type DisplayEntry = AggregatedEntry & {
  valuesInRange: TrendValue[];
  labelsInRange: string[];
  uptime: number;
  openRuns: number;
  observedRuns: number;
  averageLatency: number | null;
  latestState: TrendService['state'] | null;
};

const SPARKLINE_WIDTH = 220;
const SPARKLINE_HEIGHT = 48;
const MAX_POINTS = 80;

const formatLabel = (run: TrendRun, index: number) => {
  if (run.label) return run.label;
  try {
    const date = new Date(run.startedAt);
    if (!Number.isNaN(date.valueOf())) {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
  } catch {
    // ignore
  }
  return `Run ${index + 1}`;
};

const decimateSeries = (
  series: TrendValue[],
  maxPoints: number,
): TrendValue[] => {
  if (series.length <= maxPoints) return series;
  const buckets = maxPoints;
  const bucketSize = series.length / buckets;
  const result: TrendValue[] = [];
  for (let i = 0; i < buckets; i += 1) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(series.length, Math.floor((i + 1) * bucketSize));
    const slice = series.slice(start, end);
    if (!slice.length) continue;
    const nonNull = slice.filter((point) => point.value != null);
    if (nonNull.length === 0) {
      const state = slice.find((point) => point.state != null)?.state ?? null;
      result.push({ value: null, state });
    } else {
      const value =
        nonNull.reduce((acc, point) => acc + (point.value ?? 0), 0) /
        nonNull.length;
      const state = nonNull[nonNull.length - 1].state ?? null;
      result.push({ value, state });
    }
  }
  return result;
};

interface SparklineProps {
  series: TrendValue[];
  color: string;
  labels: string[];
}

const Sparkline: React.FC<SparklineProps> = ({ series, color, labels }) => {
  const decimated = useMemo(
    () => decimateSeries(series, MAX_POINTS),
    [series],
  );
  const values = decimated.map((point) => point.value).filter((v) => v != null) as number[];
  const max = Math.max(1, ...values);
  const path = decimated
    .map((point, index) => {
      const x = (index / Math.max(decimated.length - 1, 1)) * SPARKLINE_WIDTH;
      if (point.value == null) {
        return null;
      }
      const y =
        SPARKLINE_HEIGHT - (point.value / max) * (SPARKLINE_HEIGHT - 8) - 4;
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .filter(Boolean)
    .join(' ');

  const title = labels
    .map((label, index) => {
      const value = series[index]?.value;
      const state = series[index]?.state;
      return `${label}: ${value != null ? `${value} ms` : 'n/a'}${
        state ? ` (${state})` : ''
      }`;
    })
    .join('\n');

  return (
    <svg
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      className="bg-gray-900 rounded"
      role="img"
      aria-label="Latency trend"
    >
      {path && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <title>{title}</title>
    </svg>
  );
};

interface TrendsProps {
  runs: TrendRun[];
}

const Row: React.FC<ListChildComponentProps<DisplayEntry[]>> = ({
  index,
  style,
  data,
}) => {
  const entry = data[index];
  const { host, hostname, service, port, uptime, openRuns, observedRuns } = entry;
  const uptimePct = observedRuns ? Math.round(uptime * 100) : 0;
  const latest = entry.latestState ?? 'unknown';
  const avgLatency =
    entry.averageLatency != null ? `${Math.round(entry.averageLatency)} ms` : 'n/a';

  return (
    <div style={style} className="px-2 py-3 border-b border-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-white">
            {host}
            <span className="text-gray-500"> · {service}:{port}</span>
          </div>
          {hostname && (
            <div className="text-xs text-gray-400">{hostname}</div>
          )}
          <div className="text-xs text-gray-400">
            {uptimePct}% uptime · {openRuns}/{observedRuns} responsive · latest {latest}
          </div>
          <div className="text-xs text-gray-400">Avg latency: {avgLatency}</div>
        </div>
        <Sparkline
          series={entry.valuesInRange}
          labels={entry.labelsInRange}
          color={uptimePct > 80 ? '#22d3ee' : uptimePct > 40 ? '#fbbf24' : '#f97316'}
        />
      </div>
    </div>
  );
};

const Trends: React.FC<TrendsProps> = ({ runs }) => {
  const [hostFilter, setHostFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [minPort, setMinPort] = useState('');
  const [maxPort, setMaxPort] = useState('');
  const [range, setRange] = useState<[number, number]>([0, Math.max(runs.length - 1, 0)]);

  useEffect(() => {
    setRange([0, Math.max(runs.length - 1, 0)]);
  }, [runs.length]);

  const runLabels = useMemo(
    () => runs.map((run, index) => formatLabel(run, index)),
    [runs],
  );

  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedEntry>();
    runs.forEach((run, runIdx) => {
      run.hosts.forEach((host) => {
        host.services.forEach((svc) => {
          const key = `${host.host}::${svc.service}::${svc.port}`;
          if (!map.has(key)) {
            map.set(key, {
              key,
              host: host.host,
              hostname: host.hostname,
              service: svc.service,
              port: svc.port,
              values: Array.from({ length: runs.length }, () => ({
                value: null,
                state: null,
              })),
            });
          }
          const entry = map.get(key);
          if (!entry) return;
          entry.values[runIdx] = {
            value:
              typeof svc.latencyMs === 'number' ? Math.max(svc.latencyMs, 0) : null,
            state: svc.state ?? null,
          };
        });
      });
    });
    return Array.from(map.values());
  }, [runs]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    aggregated.forEach((entry) => set.add(entry.service));
    return Array.from(set).sort();
  }, [aggregated]);

  const [start, end] = range;
  const clampedStart = Math.max(0, Math.min(start, runs.length - 1));
  const clampedEnd = Math.max(clampedStart, Math.min(end, runs.length - 1));

  const displayEntries = useMemo(() => {
    const lowerHost = hostFilter.trim().toLowerCase();
    return aggregated
      .map((entry) => {
        const slice = entry.values.slice(clampedStart, clampedEnd + 1);
        const labels = runLabels.slice(clampedStart, clampedEnd + 1);
        const observed = slice.filter((v) => v.state != null).length;
        const openRuns = slice.filter((v) => v.state === 'open').length;
        const latencyValues = slice
          .map((v) => v.value)
          .filter((v): v is number => typeof v === 'number');
        const averageLatency =
          latencyValues.length > 0
            ? latencyValues.reduce((acc, v) => acc + v, 0) / latencyValues.length
            : null;
        let latestState: TrendService['state'] | null = null;
        for (let i = slice.length - 1; i >= 0; i -= 1) {
          if (slice[i].state) {
            latestState = slice[i].state;
            break;
          }
        }
        const uptime = observed > 0 ? openRuns / observed : 0;
        return {
          ...entry,
          valuesInRange: slice,
          labelsInRange: labels,
          uptime,
          openRuns,
          observedRuns: observed,
          averageLatency,
          latestState,
        };
      })
      .filter((entry) => {
        if (lowerHost && !entry.host.toLowerCase().includes(lowerHost)) {
          return false;
        }
        if (serviceFilter !== 'all' && entry.service !== serviceFilter) {
          return false;
        }
        const minPortValue = minPort ? Number(minPort) : null;
        const maxPortValue = maxPort ? Number(maxPort) : null;
        if (minPortValue != null && Number.isFinite(minPortValue)) {
          if (entry.port < minPortValue) return false;
        }
        if (maxPortValue != null && Number.isFinite(maxPortValue)) {
          if (entry.port > maxPortValue) return false;
        }
        if (stateFilter === 'always-open' && !(entry.observedRuns > 0 && entry.uptime === 1)) {
          return false;
        }
        if (stateFilter === 'never-open' && entry.openRuns > 0) {
          return false;
        }
        if (
          stateFilter === 'flapping' &&
          !(entry.openRuns > 0 && entry.openRuns < entry.observedRuns)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.host === b.host) {
          return a.port - b.port;
        }
        return a.host.localeCompare(b.host, undefined, { numeric: true });
      });
  }, [
    aggregated,
    clampedEnd,
    clampedStart,
    hostFilter,
    maxPort,
    minPort,
    runLabels,
    serviceFilter,
    stateFilter,
  ]);

  const exportJson = useCallback(() => {
    const data = displayEntries.map((entry) => ({
      host: entry.host,
      hostname: entry.hostname,
      service: entry.service,
      port: entry.port,
      uptime: entry.uptime,
      openRuns: entry.openRuns,
      observedRuns: entry.observedRuns,
      averageLatency: entry.averageLatency,
      runs: entry.valuesInRange.map((value, index) => ({
        label: entry.labelsInRange[index],
        latencyMs: value.value,
        state: value.state,
      })),
    }));
    const blob = new Blob([JSON.stringify({
      range: {
        start: clampedStart,
        end: clampedEnd,
        labels: runLabels.slice(clampedStart, clampedEnd + 1),
      },
      entries: data,
    }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmap-trends.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [clampedEnd, clampedStart, displayEntries, runLabels]);

  const exportCsv = useCallback(() => {
    const rows = ['host,hostname,service,port,run_label,state,latency_ms'];
    displayEntries.forEach((entry) => {
      entry.valuesInRange.forEach((value, index) => {
        const label = entry.labelsInRange[index];
        rows.push(
          [
            entry.host,
            entry.hostname ?? '',
            entry.service,
            entry.port,
            label,
            value.state ?? '',
            value.value ?? '',
          ]
            .map((field) =>
              typeof field === 'number' ? field.toString() : `"${String(field).replace(/"/g, '""')}"`,
            )
            .join(','),
        );
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmap-trends.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [displayEntries]);

  if (!runs.length) {
    return (
      <div className="text-sm text-gray-400" role="status">
        Trend history will appear after you import run data.
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Nmap trend explorer">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="trend-host-filter" className="text-xs uppercase tracking-wide text-gray-400">
            Host filter
          </label>
          <input
            id="trend-host-filter"
            type="text"
            value={hostFilter}
            onChange={(event) => setHostFilter(event.target.value)}
            className="px-2 py-1 rounded bg-gray-900 border border-gray-700 text-sm"
            placeholder="192.0.2.10"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="trend-service-filter" className="text-xs uppercase tracking-wide text-gray-400">
            Service
          </label>
          <select
            id="trend-service-filter"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className="px-2 py-1 rounded bg-gray-900 border border-gray-700 text-sm"
          >
            <option value="all">All</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="trend-state-filter" className="text-xs uppercase tracking-wide text-gray-400">
            State
          </label>
          <select
            id="trend-state-filter"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
            className="px-2 py-1 rounded bg-gray-900 border border-gray-700 text-sm"
          >
            <option value="all">All</option>
            <option value="always-open">Always open</option>
            <option value="flapping">Flapping</option>
            <option value="never-open">Never open</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="trend-port-min" className="text-xs uppercase tracking-wide text-gray-400">
            Min port
          </label>
          <input
            id="trend-port-min"
            type="number"
            inputMode="numeric"
            value={minPort}
            onChange={(event) => setMinPort(event.target.value)}
            className="px-2 py-1 rounded bg-gray-900 border border-gray-700 text-sm"
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="trend-port-max" className="text-xs uppercase tracking-wide text-gray-400">
            Max port
          </label>
          <input
            id="trend-port-max"
            type="number"
            inputMode="numeric"
            value={maxPort}
            onChange={(event) => setMaxPort(event.target.value)}
            className="px-2 py-1 rounded bg-gray-900 border border-gray-700 text-sm"
            placeholder="65535"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setHostFilter('');
              setServiceFilter('all');
              setStateFilter('all');
              setMinPort('');
              setMaxPort('');
              setRange([0, Math.max(runs.length - 1, 0)]);
            }}
            className="px-3 py-1 bg-gray-800 rounded text-sm"
          >
            Reset
          </button>
          <div className="text-xs text-gray-500">
            Showing {displayEntries.length} of {aggregated.length}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-400">Run range</span>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="trend-range-start" className="sr-only">
            Start run
          </label>
          <select
            id="trend-range-start"
            value={clampedStart}
            onChange={(event) => {
              const next = Number(event.target.value);
              setRange([next, Math.max(next, clampedEnd)]);
            }}
            className="px-2 py-1 rounded bg-gray-900 border border-gray-700"
          >
            {runLabels.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
          <span>to</span>
          <label htmlFor="trend-range-end" className="sr-only">
            End run
          </label>
          <select
            id="trend-range-end"
            value={clampedEnd}
            onChange={(event) => {
              const next = Number(event.target.value);
              setRange([Math.min(clampedStart, next), next]);
            }}
            className="px-2 py-1 rounded bg-gray-900 border border-gray-700"
          >
            {runLabels.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={exportJson}
              className="px-3 py-1 bg-blue-700 rounded text-sm"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="px-3 py-1 bg-green-700 rounded text-sm"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="border border-gray-800 rounded bg-gray-950">
        {displayEntries.length > 0 ? (
          <List
            height={Math.min(440, displayEntries.length * 78)}
            itemCount={displayEntries.length}
            itemSize={78}
            width="100%"
            itemData={displayEntries}
          >
            {Row}
          </List>
        ) : (
          <div className="p-4 text-sm text-gray-400">No entries match the filters.</div>
        )}
      </div>
    </section>
  );
};

export default Trends;
