import React, { useEffect, useMemo, useState } from 'react';
import {
  RunHistoryEntry,
  RunTool,
  filterHistoryEntries,
  prepareHistoryEntries,
  subscribeRunHistory,
} from '../../utils/runHistory';

export interface RunHistoryProps {
  tools?: RunTool[];
  onRerun?: Partial<Record<RunTool, (entry: RunHistoryEntry) => void>>;
  className?: string;
  emptyMessage?: string;
}

const toolLabels: Record<RunTool, string> = {
  nmap: 'Nmap',
  hydra: 'Hydra',
  hashcat: 'Hashcat',
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString()} · ${date.toLocaleDateString()}`;
};

const RunHistory: React.FC<RunHistoryProps> = ({
  tools,
  onRerun = {},
  className = '',
  emptyMessage = 'No runs logged yet.',
}) => {
  const [entries, setEntries] = useState<RunHistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [toolFilter, setToolFilter] = useState<RunTool | 'all'>(
    tools && tools.length === 1 ? tools[0] : 'all'
  );
  const searchId = useMemo(
    () => `run-history-search-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  useEffect(() => {
    return subscribeRunHistory(setEntries);
  }, []);

  useEffect(() => {
    if (tools && tools.length === 1) {
      setToolFilter(tools[0]);
    }
  }, [tools]);

  const prepared = useMemo(() => prepareHistoryEntries(entries), [entries]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    prepared.forEach((entry) => {
      entry.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [prepared]);

  const filtered = useMemo(
    () =>
      filterHistoryEntries(prepared, {
        query,
        tags: selectedTags,
        tool: toolFilter,
        tools,
      }),
    [prepared, query, selectedTags, toolFilter, tools]
  );

  const groupedByDay = useMemo(() => {
    const grouped = new Map<string, typeof filtered>();
    filtered.forEach((entry) => {
      const key = new Date(entry.createdAt).toDateString();
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(entry);
    });
    return grouped;
  }, [filtered]);

  const sortedDays = useMemo(
    () =>
      Array.from(groupedByDay.keys()).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      ),
    [groupedByDay]
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const handleRerun = (entry: RunHistoryEntry) => {
    const rerun = onRerun[entry.tool];
    if (rerun) {
      rerun(entry);
    }
  };

  return (
    <div
      className={`bg-gray-900 text-white border border-gray-700 rounded-md p-3 space-y-3 ${className}`.trim()}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <label className="sr-only" htmlFor={searchId}>
          Search run history
        </label>
        <input
          id={searchId}
          type="search"
          placeholder="Search history"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search run history"
          className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ub-yellow"
        />
        {(tools?.length || 0) !== 1 && (
          <select
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value as RunTool | 'all')}
            aria-label="Filter history by tool"
            className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ub-yellow"
          >
            <option value="all">All tools</option>
            {(['nmap', 'hydra', 'hashcat'] as RunTool[])
              .filter((tool) => !tools || tools.includes(tool))
              .map((tool) => (
                <option key={tool} value={tool}>
                  {toolLabels[tool]}
                </option>
              ))}
          </select>
        )}
      </div>
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 rounded-full text-xs transition-colors ${
                  active
                    ? 'bg-ub-yellow text-black'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {sortedDays.map((day) => (
            <div key={day} className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-gray-400">
                {day}
              </h3>
              <ul className="space-y-2">
                {(groupedByDay.get(day) || []).map((entry) => (
                  <li
                    key={entry.id}
                    className="border border-gray-800 rounded-md p-3 bg-gray-950"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {entry.summary || entry.command}
                        </p>
                        <p className="text-xs text-gray-400">
                          {toolLabels[entry.tool]} · {formatTimestamp(entry.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRerun(entry)}
                        className="text-xs px-2 py-1 bg-ub-yellow text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
                      >
                        Re-run
                      </button>
                    </div>
                    <pre className="mt-2 text-xs bg-gray-900 p-2 rounded border border-gray-800 whitespace-pre-wrap break-words">
                      {entry.command}
                    </pre>
                    {entry.notes && (
                      <p className="mt-2 text-xs text-gray-300">{entry.notes}</p>
                    )}
                    {entry.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-[10px]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RunHistory;
