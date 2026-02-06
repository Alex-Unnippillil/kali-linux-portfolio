import React, { useEffect, useMemo, useState } from 'react';
import hostComparisons from '../host-comparisons.json';

export interface ResultItem {
  title: string;
  output: string;
}

export interface HostSnapshot {
  previous: ResultItem[];
  current: ResultItem[];
}

export type HostComparisonData = Record<string, HostSnapshot>;

type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

interface DiffEntry {
  title: string;
  status: DiffStatus;
  previous?: ResultItem;
  current?: ResultItem;
}

const statusStyles: Record<DiffStatus, string> = {
  added: 'border-green-500 bg-green-900/50',
  removed: 'border-red-500 bg-red-900/50',
  changed: 'border-amber-500 bg-amber-900/40',
  unchanged: 'border-gray-700 bg-gray-800/50',
};

const statusLabels: Record<DiffStatus, string> = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Modified',
  unchanged: 'Unchanged',
};

const defaultData = hostComparisons as HostComparisonData;

const getDiffEntries = (snapshot?: HostSnapshot): DiffEntry[] => {
  if (!snapshot) {
    return [];
  }

  const previousMap = new Map(snapshot.previous.map((item) => [item.title, item]));
  const currentMap = new Map(snapshot.current.map((item) => [item.title, item]));

  const titles = Array.from(new Set([...previousMap.keys(), ...currentMap.keys()])).sort();

  return titles.map((title) => {
    const previous = previousMap.get(title);
    const current = currentMap.get(title);

    if (previous && current) {
      if (previous.output.trim() === current.output.trim()) {
        return { title, status: 'unchanged', previous, current };
      }
      return { title, status: 'changed', previous, current };
    }

    if (current) {
      return { title, status: 'added', current };
    }

    return { title, status: 'removed', previous };
  });
};

const HostComparison: React.FC<{ data?: HostComparisonData }> = ({ data = defaultData }) => {
  const hosts = useMemo(() => Object.keys(data), [data]);
  const [activeHost, setActiveHost] = useState(hosts[0] ?? '');

  useEffect(() => {
    if (hosts.length === 0) {
      setActiveHost('');
      return;
    }
    if (!hosts.includes(activeHost)) {
      setActiveHost(hosts[0]);
    }
  }, [hosts, activeHost]);

  const snapshot = activeHost ? data[activeHost] : undefined;
  const diffEntries = useMemo(() => getDiffEntries(snapshot), [snapshot]);
  const actionableDiffs = diffEntries.filter((entry) => entry.status !== 'unchanged');

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-semibold">Host Comparison</h3>
        <span className="text-xs uppercase tracking-wider text-gray-400">Snapshots</span>
      </div>
      {hosts.length === 0 ? (
        <p className="text-gray-400">No host snapshots available.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {hosts.map((host) => (
              <button
                key={host}
                type="button"
                onClick={() => setActiveHost(host)}
                className={`px-3 py-1 rounded border transition ${
                  activeHost === host
                    ? 'border-blue-500 bg-blue-900/40 text-blue-200'
                    : 'border-gray-700 bg-gray-800/60 text-gray-200 hover:border-blue-500/60'
                }`}
                aria-pressed={activeHost === host}
              >
                {host}
              </button>
            ))}
          </div>
          <div className="rounded border border-gray-700 bg-gray-800/60 p-4">
            <h4 className="font-semibold text-sm text-gray-200">{activeHost}</h4>
            {actionableDiffs.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No changes detected for this host.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {actionableDiffs.map((entry) => (
                  <li
                    key={entry.title}
                    className={`rounded border p-3 transition ${statusStyles[entry.status]}`}
                    data-status={entry.status}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-gray-100">{entry.title}</span>
                      <span
                        className="text-xs font-medium uppercase tracking-wide text-gray-200"
                        aria-label={`Result ${statusLabels[entry.status]}`}
                      >
                        {statusLabels[entry.status]}
                      </span>
                    </div>
                    {entry.status === 'added' && entry.current && (
                      <p className="mt-2 whitespace-pre-line text-sm text-green-100">{entry.current.output}</p>
                    )}
                    {entry.status === 'removed' && entry.previous && (
                      <p className="mt-2 whitespace-pre-line text-sm text-red-100">{entry.previous.output}</p>
                    )}
                    {entry.status === 'changed' && entry.previous && entry.current && (
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <div>
                          <h5 className="text-xs uppercase tracking-wider text-gray-300">Previous</h5>
                          <p className="mt-1 whitespace-pre-line text-sm text-red-100/90">
                            {entry.previous.output}
                          </p>
                        </div>
                        <div>
                          <h5 className="text-xs uppercase tracking-wider text-gray-300">Current</h5>
                          <p className="mt-1 whitespace-pre-line text-sm text-green-100/90">
                            {entry.current.output}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export { getDiffEntries };
export default HostComparison;
