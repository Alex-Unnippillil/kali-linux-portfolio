'use client';

import { useEffect, useMemo, useState } from 'react';

export const REFRESH_INTERVAL_MS = 15000;

type TileStatus = 'loading' | 'good' | 'warning' | 'critical';

interface PingRegion {
  name: string;
  latencyMs: number;
  slaMs: number;
}

interface PingResponse {
  updatedAt: string;
  regions: PingRegion[];
}

interface ErrorService {
  name: string;
  errorRate: number;
  target: number;
}

interface ErrorResponse {
  updatedAt: string;
  services: ErrorService[];
}

interface VersionInfo {
  version: string;
  build?: string;
  commit?: string;
  releasedAt: string;
  notes?: string;
}

interface TileDescriptor {
  id: string;
  title: string;
  status: TileStatus;
  value: string;
  meta?: string;
  description: string;
  tooltip: string;
}

const statusThemes: Record<TileStatus, string> = {
  loading: 'border-slate-600 bg-slate-900/60',
  good: 'border-green-400 bg-green-500/20',
  warning: 'border-yellow-400 bg-yellow-500/20',
  critical: 'border-red-500 bg-red-500/20',
};

const statusAccent: Record<TileStatus, string> = {
  loading: 'text-slate-300',
  good: 'text-green-300',
  warning: 'text-yellow-200',
  critical: 'text-red-300',
};

const statusLabels: Record<TileStatus, string> = {
  loading: 'Loading',
  good: 'Operational',
  warning: 'Investigate',
  critical: 'Critical',
};

const FETCH_OPTIONS: RequestInit = { cache: 'no-store' };

const safeFormatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
};

const formatLatency = (value: number) => `${Math.round(value)} ms`;
const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

const classifyLatency = (latency: number, slo: number): Exclude<TileStatus, 'loading'> => {
  if (latency <= slo) {
    return 'good';
  }
  if (latency <= slo * 1.5) {
    return 'warning';
  }
  return 'critical';
};

const classifyErrorRate = (rate: number, target: number): Exclude<TileStatus, 'loading'> => {
  if (rate <= target) {
    return 'good';
  }
  if (rate <= target * 2) {
    return 'warning';
  }
  return 'critical';
};

const toTitleCase = (value: string) =>
  value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, FETCH_OPTIONS);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function StatusTile({ tile }: { tile: TileDescriptor }) {
  return (
    <article
      role="listitem"
      data-testid={`tile-${tile.id}`}
      data-status={tile.status}
      className={`border rounded-lg px-4 py-5 shadow-lg transition-colors duration-300 ${statusThemes[tile.status]}`}
      title={tile.tooltip}
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
        <span>{tile.title}</span>
        <span className={`font-semibold ${statusAccent[tile.status]}`}>
          {statusLabels[tile.status]}
        </span>
      </div>
      <div className="mt-3 text-3xl font-mono">{tile.value}</div>
      {tile.meta ? <div className="mt-2 text-sm text-slate-200">{tile.meta}</div> : null}
      <div className="mt-2 text-xs text-slate-400 whitespace-pre-line leading-snug">
        {tile.description}
      </div>
    </article>
  );
}

export default function OpsDashboard() {
  const [pingData, setPingData] = useState<PingResponse | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);
  const [errorData, setErrorData] = useState<ErrorResponse | null>(null);
  const [errorRateError, setErrorRateError] = useState<string | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadMetrics = async () => {
      const [pingResult, errorResult] = await Promise.allSettled(
        [
          fetchJson<PingResponse>('/api/status/pings'),
          fetchJson<ErrorResponse>('/api/status/errors'),
        ] as [Promise<PingResponse>, Promise<ErrorResponse>],
      );

      if (!active) {
        return;
      }

      if (pingResult.status === 'fulfilled') {
        setPingData(pingResult.value);
        setPingError(null);
      } else {
        setPingData(null);
        setPingError('Unable to retrieve latency metrics.');
      }

      if (errorResult.status === 'fulfilled') {
        setErrorData(errorResult.value);
        setErrorRateError(null);
      } else {
        setErrorData(null);
        setErrorRateError('Unable to retrieve error rates.');
      }
    };

    loadMetrics();
    const intervalId = setInterval(loadMetrics, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadVersion = async () => {
      try {
        const data = await fetchJson<VersionInfo>('/version.json');
        if (!active) {
          return;
        }
        setVersionInfo(data);
        setVersionError(null);
      } catch (error) {
        if (!active) {
          return;
        }
        setVersionInfo(null);
        setVersionError('Unable to load build metadata.');
      }
    };

    loadVersion();

    return () => {
      active = false;
    };
  }, []);

  const tiles = useMemo<TileDescriptor[]>(() => {
    const latencyTile: TileDescriptor = (() => {
      if (pingError) {
        return {
          id: 'pings',
          title: 'Global latency',
          status: 'critical',
          value: 'Offline',
          description: pingError,
          tooltip: pingError,
        };
      }
      if (!pingData || pingData.regions.length === 0) {
        return {
          id: 'pings',
          title: 'Global latency',
          status: 'loading',
          value: '--',
          description: 'Waiting for telemetry from edge locations.',
          tooltip: 'Awaiting the first ping sample from each region.',
        };
      }

      const averageLatency =
        pingData.regions.reduce((sum, region) => sum + region.latencyMs, 0) /
        pingData.regions.length;
      const worstRegion = pingData.regions.reduce((worst, region) =>
        region.latencyMs > worst.latencyMs ? region : worst,
      pingData.regions[0]);
      const slo = pingData.regions.reduce(
        (max, region) => Math.max(max, region.slaMs),
        200,
      );
      const status = classifyLatency(worstRegion.latencyMs, slo);

      const tooltip = pingData.regions
        .map(
          (region) =>
            `${region.name.toUpperCase()}: ${formatLatency(region.latencyMs)} (SLA ${region.slaMs}ms)`,
        )
        .join('\n');

      return {
        id: 'pings',
        title: 'Global latency',
        status,
        value: formatLatency(averageLatency),
        meta: `Slowest region: ${worstRegion.name.toUpperCase()} (${formatLatency(
          worstRegion.latencyMs,
        )})`,
        description: `Updated ${safeFormatDateTime(pingData.updatedAt)}`,
        tooltip,
      };
    })();

    const errorsTile: TileDescriptor = (() => {
      if (errorRateError) {
        return {
          id: 'errors',
          title: 'Error budget',
          status: 'critical',
          value: 'Unavailable',
          description: errorRateError,
          tooltip: errorRateError,
        };
      }
      if (!errorData || errorData.services.length === 0) {
        return {
          id: 'errors',
          title: 'Error budget',
          status: 'loading',
          value: '--',
          description: 'Collecting error telemetry from services.',
          tooltip: 'Awaiting error rate samples from core services.',
        };
      }

      const worstService = errorData.services.reduce((worst, service) =>
        service.errorRate > worst.errorRate ? service : worst,
      errorData.services[0]);
      const status = classifyErrorRate(
        worstService.errorRate,
        worstService.target || 0.01,
      );
      const tooltip = errorData.services
        .map(
          (service) =>
            `${toTitleCase(service.name)}: ${formatPercent(service.errorRate)} (SLO ${formatPercent(
              service.target,
            )})`,
        )
        .join('\n');

      return {
        id: 'errors',
        title: 'Error budget',
        status,
        value: formatPercent(worstService.errorRate),
        meta: `${toTitleCase(worstService.name)} target ${formatPercent(
          worstService.target,
        )}`,
        description: `Updated ${safeFormatDateTime(errorData.updatedAt)}`,
        tooltip,
      };
    })();

    const versionTile: TileDescriptor = (() => {
      if (versionError) {
        return {
          id: 'version',
          title: 'Release',
          status: 'critical',
          value: 'Unknown',
          description: versionError,
          tooltip: versionError,
        };
      }
      if (!versionInfo) {
        return {
          id: 'version',
          title: 'Release',
          status: 'loading',
          value: '--',
          description: 'Fetching build metadata…',
          tooltip: 'Waiting for release metadata from version.json.',
        };
      }

      const metaParts = [
        versionInfo.build ? `Build ${versionInfo.build}` : null,
        versionInfo.commit ? `Commit ${versionInfo.commit}` : null,
      ].filter(Boolean);
      const descriptionParts = [
        `Released ${safeFormatDateTime(versionInfo.releasedAt)}`,
        versionInfo.notes ?? null,
      ].filter(Boolean);

      return {
        id: 'version',
        title: 'Release',
        status: 'good',
        value: versionInfo.version,
        meta: metaParts.join(' • ') || undefined,
        description: descriptionParts.join('\n'),
        tooltip:
          [
            `Version ${versionInfo.version}`,
            metaParts.join(' • ') || undefined,
            versionInfo.notes || undefined,
          ]
            .filter(Boolean)
            .join('\n'),
      };
    })();

    return [latencyTile, errorsTile, versionTile];
  }, [pingData, pingError, errorData, errorRateError, versionInfo, versionError]);

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white overflow-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-wide">Operations Dashboard</h1>
          <p className="text-sm text-slate-200/80">
            Live telemetry from demo status endpoints. Data refreshes every{' '}
            {REFRESH_INTERVAL_MS / 1000} seconds.
          </p>
        </header>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
          {tiles.map((tile) => (
            <StatusTile key={tile.id} tile={tile} />
          ))}
        </section>
      </div>
    </div>
  );
}
