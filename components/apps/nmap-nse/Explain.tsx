import React, { useCallback, useMemo } from 'react';

const numberFormatter = new Intl.NumberFormat('en-US');

export type ScriptResult = {
  name: string;
  output?: string;
};

export type PortFinding = {
  port: number;
  service?: string;
  state?: string;
  scripts?: ScriptResult[];
};

export type HostFinding = {
  ip: string;
  hostname?: string;
  ports: PortFinding[];
};

export type ExplainProps = {
  hosts?: HostFinding[];
  previousHosts?: HostFinding[];
  onExport?: (message: string) => void;
  runLabel?: string;
  previousRunLabel?: string;
};

type PortStateDelta = {
  state: string;
  current: number;
  previous: number;
  delta: number;
};

type Summary = {
  hostCount: number;
  previousHostCount: number;
  newHosts: HostFinding[];
  removedHosts: HostFinding[];
  portStates: PortStateDelta[];
  markdown: string;
};

const DEFAULT_SUMMARY: Summary = {
  hostCount: 0,
  previousHostCount: 0,
  newHosts: [],
  removedHosts: [],
  portStates: [],
  markdown: '# Nmap NSE summary\n\n_No scan data available._\n'
};

const formatCount = (value: number, noun: string) => {
  const formatted = numberFormatter.format(value);
  const plural = value === 1 ? noun : `${noun}s`;
  return `${formatted} ${plural}`;
};

const formatDelta = (value: number) => {
  if (value > 0) return `+${numberFormatter.format(value)}`;
  if (value < 0) return `-${numberFormatter.format(Math.abs(value))}`;
  return '0';
};

const buildMarkdown = (
  summary: Summary,
  runLabel?: string,
  previousRunLabel?: string
) => {
  if (!summary.hostCount && !summary.previousHostCount) {
    return DEFAULT_SUMMARY.markdown;
  }
  const lines = [
    '# Nmap NSE summary',
    '',
    runLabel ? `* Current run: ${runLabel}` : '* Current run',
    previousRunLabel
      ? `* Previous run: ${previousRunLabel}`
      : '* Previous run',
    `* Hosts scanned: ${summary.hostCount}`,
    `* Hosts in previous run: ${summary.previousHostCount}`,
    `* New hosts: ${summary.newHosts.length}`,
    `* Removed hosts: ${summary.removedHosts.length}`,
    '',
    '## Port states',
    '',
    '| State | Current | Previous | Delta |',
    '| --- | ---: | ---: | ---: |',
  ];

  if (summary.portStates.length) {
    summary.portStates.forEach((row) => {
      lines.push(
        `| ${row.state} | ${row.current} | ${row.previous} | ${row.delta > 0 ? '+' : ''}${row.delta} |`
      );
    });
  } else {
    lines.push('| _none_ | 0 | 0 | 0 |');
  }

  if (summary.newHosts.length) {
    lines.push('', '## New hosts', '');
    summary.newHosts.forEach((host) => {
      lines.push(`- ${host.ip}`);
    });
  }

  if (summary.removedHosts.length) {
    lines.push('', '## Removed hosts', '');
    summary.removedHosts.forEach((host) => {
      lines.push(`- ${host.ip}`);
    });
  }

  return `${lines.join('\n')}\n`;
};

const deriveSummary = (
  hosts: HostFinding[] = [],
  previousHosts: HostFinding[] = [],
  runLabel?: string,
  previousRunLabel?: string
): Summary => {
  if (!hosts.length && !previousHosts.length) {
    return { ...DEFAULT_SUMMARY, markdown: DEFAULT_SUMMARY.markdown };
  }

  const previousHostSet = new Set(previousHosts.map((host) => host.ip));
  const currentHostSet = new Set(hosts.map((host) => host.ip));

  const newHosts = hosts.filter((host) => !previousHostSet.has(host.ip));
  const removedHosts = previousHosts.filter(
    (host) => !currentHostSet.has(host.ip)
  );

  const countPortStates = (source: HostFinding[]) => {
    const map = new Map<string, number>();
    source.forEach((host) => {
      host.ports?.forEach((port) => {
        const state = (port.state || 'open').toLowerCase();
        map.set(state, (map.get(state) || 0) + 1);
      });
    });
    return map;
  };

  const currentPortStates = countPortStates(hosts);
  const previousPortStates = countPortStates(previousHosts);
  const allStates = new Set([
    ...Array.from(currentPortStates.keys()),
    ...Array.from(previousPortStates.keys()),
  ]);

  const portStates = Array.from(allStates)
    .map<PortStateDelta>((state) => {
      const current = currentPortStates.get(state) || 0;
      const previous = previousPortStates.get(state) || 0;
      return {
        state,
        current,
        previous,
        delta: current - previous,
      };
    })
    .sort((a, b) => b.current - a.current || a.state.localeCompare(b.state));

  const summary: Summary = {
    hostCount: hosts.length,
    previousHostCount: previousHosts.length,
    newHosts,
    removedHosts,
    portStates,
    markdown: '',
  };

  summary.markdown = buildMarkdown(summary, runLabel, previousRunLabel);
  return summary;
};

const Explain: React.FC<ExplainProps> = ({
  hosts = [],
  previousHosts = [],
  onExport,
  runLabel,
  previousRunLabel,
}) => {
  const summary = useMemo(
    () => deriveSummary(hosts, previousHosts, runLabel, previousRunLabel),
    [hosts, previousHosts, runLabel, previousRunLabel]
  );

  const topNewHosts = useMemo(
    () => summary.newHosts.slice(0, 5),
    [summary.newHosts]
  );
  const topRemovedHosts = useMemo(
    () => summary.removedHosts.slice(0, 5),
    [summary.removedHosts]
  );

  const handleExport = useCallback(async () => {
    if (!summary.markdown) return;
    const messageSuccess = 'Markdown summary copied to clipboard';
    const messageFallback = 'Markdown summary ready for download';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary.markdown);
        onExport?.(messageSuccess);
        return;
      }
    } catch (error) {
      // continue with fallback
    }

    if (typeof window !== 'undefined') {
      const blob = new Blob([summary.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nmap-summary.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onExport?.(messageFallback);
    }
  }, [summary.markdown, onExport]);

  return (
    <section
      aria-label="Scan summary"
      className="mb-4 rounded border border-gray-700 bg-gray-900/60 p-4 text-sm"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-blue-300">Scan summary</h3>
          <p className="text-xs text-gray-400">
            Comparing current results with the previous saved run.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-ub-grey px-2 py-1 text-xs font-semibold text-black transition hover:bg-ub-yellow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
        >
          Export Markdown
        </button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="uppercase tracking-wide text-gray-400">Hosts scanned</dt>
          <dd className="text-lg font-semibold text-white">
            {formatCount(summary.hostCount, 'host')}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-gray-400">
            Hosts in previous run
          </dt>
          <dd className="text-lg font-semibold text-white">
            {formatCount(summary.previousHostCount, 'host')}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-gray-400">New hosts</dt>
          <dd className="text-lg font-semibold text-white">
            {formatCount(summary.newHosts.length, 'host')}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-gray-400">Removed hosts</dt>
          <dd className="text-lg font-semibold text-white">
            {formatCount(summary.removedHosts.length, 'host')}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
          Port states
        </h4>
        {summary.portStates.length ? (
          <ul className="space-y-1">
            {summary.portStates.map((row) => (
              <li
                key={row.state}
                className="flex items-center justify-between rounded bg-black/40 px-2 py-1 font-mono"
              >
                <span className="lowercase text-gray-200">{row.state}</span>
                <span className="flex items-center gap-3 text-gray-100">
                  <span>
                    {numberFormatter.format(row.current)} current
                  </span>
                  <span className="text-gray-400">
                    prev {numberFormatter.format(row.previous)}
                  </span>
                  <span
                    className={`font-semibold ${
                      row.delta > 0
                        ? 'text-green-400'
                        : row.delta < 0
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    Δ {formatDelta(row.delta)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No port data recorded.</p>
        )}
      </div>

      {topNewHosts.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
            New hosts discovered
          </h4>
          <ul className="space-y-1 text-gray-100">
            {topNewHosts.map((host) => (
              <li key={host.ip} className="rounded bg-black/40 px-2 py-1 font-mono">
                {host.ip}
              </li>
            ))}
          </ul>
          {summary.newHosts.length > topNewHosts.length && (
            <p className="mt-1 text-xs text-gray-400">
              +{numberFormatter.format(
                summary.newHosts.length - topNewHosts.length
              )}{' '}
              more new hosts not shown.
            </p>
          )}
        </div>
      )}

      {topRemovedHosts.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
            Hosts no longer present
          </h4>
          <ul className="space-y-1 text-gray-100">
            {topRemovedHosts.map((host) => (
              <li key={host.ip} className="rounded bg-black/40 px-2 py-1 font-mono">
                {host.ip}
              </li>
            ))}
          </ul>
          {summary.removedHosts.length > topRemovedHosts.length && (
            <p className="mt-1 text-xs text-gray-400">
              +{numberFormatter.format(
                summary.removedHosts.length - topRemovedHosts.length
              )}{' '}
              additional hosts removed.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default Explain;
