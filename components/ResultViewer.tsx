"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface ViewerProps {
  data: any[];
}

const toValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const fuzzyScore = (text: string, query: string) => {
  if (!query) return 0;
  let score = 0;
  let index = 0;
  for (const char of query) {
    const found = text.indexOf(char, index);
    if (found === -1) {
      return Number.NEGATIVE_INFINITY;
    }
    // Reward consecutive matches and characters found earlier in the string.
    if (found === index) {
      score += 2;
    } else {
      score += 1;
    }
    index = found + 1;
  }
  return score;
};

export default function ResultViewer({ data }: ViewerProps) {
  const [tab, setTab] = useState<'raw' | 'parsed' | 'chart'>('raw');
  const [sortKey, setSortKey] = useState('');
  const [search, setSearch] = useState('');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPosition = useRef(0);

  useEffect(() => {
    try {
      const sk = localStorage.getItem('rv-sort');
      if (sk) setSortKey(sk);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rv-sort', sortKey);
    } catch {
      /* ignore */
    }
  }, [sortKey]);

  const { keys, apps, channels, levels } = useMemo(() => {
    const keys = data[0] ? Object.keys(data[0]) : [];
    const appSet = new Set<string>();
    const channelSet = new Set<string>();
    const levelSet = new Set<string>();

    data.forEach((row) => {
      const record = row as Record<string, unknown>;
      const app = toValue(record.app);
      const channel = toValue(record.channel);
      const level = toValue(record.level);

      if (app) appSet.add(app);
      if (channel) channelSet.add(channel);
      if (level) levelSet.add(level);
    });

    return {
      keys,
      apps: Array.from(appSet).sort(),
      channels: Array.from(channelSet).sort(),
      levels: Array.from(levelSet).sort(),
    };
  }, [data]);

  useEffect(() => {
    setSelectedApps((prev) => prev.filter((value) => apps.includes(value)));
  }, [apps]);

  useEffect(() => {
    setSelectedChannels((prev) => prev.filter((value) => channels.includes(value)));
  }, [channels]);

  useEffect(() => {
    setSelectedLevels((prev) => prev.filter((value) => levels.includes(value)));
  }, [levels]);

  const parsedRows = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();

    const entries = data.map((row) => {
      const record = row as Record<string, unknown>;
      const text = JSON.stringify(row).toLowerCase();
      const score = lowerSearch ? fuzzyScore(text, lowerSearch) : 0;
      const app = toValue(record.app);
      const channel = toValue(record.channel);
      const level = toValue(record.level);
      return { row, record, score, app, channel, level };
    });

    const filtered = entries.filter(({ score, app, channel, level }) => {
      if (lowerSearch && score === Number.NEGATIVE_INFINITY) return false;
      if (selectedApps.length > 0 && !selectedApps.includes(app)) return false;
      if (selectedChannels.length > 0 && !selectedChannels.includes(channel)) return false;
      if (selectedLevels.length > 0 && !selectedLevels.includes(level)) return false;
      return true;
    });

    let ordered = filtered;
    if (sortKey) {
      ordered = [...filtered].sort((a, b) => {
        const av = toValue(a.record[sortKey]);
        const bv = toValue(b.record[sortKey]);
        if (av === bv) return 0;
        return av > bv ? 1 : -1;
      });
    } else if (lowerSearch) {
      ordered = [...filtered].sort((a, b) => b.score - a.score);
    }

    return ordered.map((entry) => entry.row);
  }, [data, search, selectedApps, selectedChannels, selectedLevels, sortKey]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = scrollPosition.current;
    }
  }, [parsedRows]);

  const exportCsv = () => {
    const csv = [keys.join(','), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleValue = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const activeChips = useMemo(
    () => {
      const chips: { key: string; label: string; onRemove: () => void }[] = [];
      selectedApps.forEach((value) =>
        chips.push({
          key: `app-${value}`,
          label: `App: ${value}`,
          onRemove: () => setSelectedApps((prev) => prev.filter((v) => v !== value)),
        })
      );
      selectedChannels.forEach((value) =>
        chips.push({
          key: `channel-${value}`,
          label: `Channel: ${value}`,
          onRemove: () => setSelectedChannels((prev) => prev.filter((v) => v !== value)),
        })
      );
      selectedLevels.forEach((value) =>
        chips.push({
          key: `level-${value}`,
          label: `Level: ${value}`,
          onRemove: () => setSelectedLevels((prev) => prev.filter((v) => v !== value)),
        })
      );
      if (search) {
        chips.push({ key: 'search', label: `Search: ${search}`, onRemove: () => setSearch('') });
      }
      return chips;
    },
    [search, selectedApps, selectedChannels, selectedLevels]
  );

  const clearFilters = () => {
    setSearch('');
    setSelectedApps([]);
    setSelectedChannels([]);
    setSelectedLevels([]);
    scrollPosition.current = 0;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="text-xs" aria-label="result viewer">
      <div role="tablist" className="mb-2 flex">
        <button role="tab" aria-selected={tab === 'raw'} onClick={() => setTab('raw')} className="px-2 py-1 bg-ub-cool-grey text-white mr-2">
          Raw
        </button>
        <button role="tab" aria-selected={tab === 'parsed'} onClick={() => setTab('parsed')} className="px-2 py-1 bg-ub-cool-grey text-white mr-2">
          Parsed
        </button>
        <button role="tab" aria-selected={tab === 'chart'} onClick={() => setTab('chart')} className="px-2 py-1 bg-ub-cool-grey text-white">
          Chart
        </button>
      </div>
      {tab === 'raw' && <pre className="bg-black text-white p-1 h-40 overflow-auto">{JSON.stringify(data, null, 2)}</pre>}
      {tab === 'parsed' && (
        <div>
          <div className="mb-2 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <label className="font-semibold">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border p-1 text-black"
                placeholder="Fuzzy search logs"
                aria-label="Fuzzy search"
              />
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                {keys.map((k) => (
                  <button
                    key={k}
                    onClick={() => setSortKey((prev) => (prev === k ? '' : k))}
                    className={`px-2 py-1 bg-ub-cool-grey text-white ${sortKey === k ? 'ring-2 ring-ub-yellow' : ''}`}
                    type="button"
                  >
                    Sort by {k}
                  </button>
                ))}
                <button onClick={exportCsv} className="px-2 py-1 bg-ub-green text-black" type="button">
                  CSV
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.onRemove}
                  className="flex items-center gap-1 px-2 py-1 bg-ub-grey text-white rounded-full"
                  type="button"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <span>{chip.label}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              <button
                onClick={clearFilters}
                className="px-2 py-1 bg-ub-cool-grey text-white rounded"
                type="button"
                disabled={activeChips.length === 0}
                aria-disabled={activeChips.length === 0}
              >
                Clear filters
              </button>
            </div>
            {(apps.length > 0 || channels.length > 0 || levels.length > 0) && (
              <div className="flex flex-col gap-2">
                {apps.length > 0 && (
                  <fieldset className="border border-ub-grey p-2 rounded">
                    <legend className="px-1">Apps</legend>
                    <div className="flex flex-wrap gap-2">
                      {apps.map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={selectedApps.includes(value)}
                          aria-label={`Toggle app ${value}`}
                          onClick={() => toggleValue(value, setSelectedApps)}
                          className={`px-2 py-1 rounded ${
                            selectedApps.includes(value) ? 'bg-ub-yellow text-black' : 'bg-ub-cool-grey text-white'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {channels.length > 0 && (
                  <fieldset className="border border-ub-grey p-2 rounded">
                    <legend className="px-1">Channels</legend>
                    <div className="flex flex-wrap gap-2">
                      {channels.map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={selectedChannels.includes(value)}
                          aria-label={`Toggle channel ${value}`}
                          onClick={() => toggleValue(value, setSelectedChannels)}
                          className={`px-2 py-1 rounded ${
                            selectedChannels.includes(value) ? 'bg-ub-yellow text-black' : 'bg-ub-cool-grey text-white'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {levels.length > 0 && (
                  <fieldset className="border border-ub-grey p-2 rounded">
                    <legend className="px-1">Levels</legend>
                    <div className="flex flex-wrap gap-2">
                      {levels.map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={selectedLevels.includes(value)}
                          aria-label={`Toggle level ${value}`}
                          onClick={() => toggleValue(value, setSelectedLevels)}
                          className={`px-2 py-1 rounded ${
                            selectedLevels.includes(value) ? 'bg-ub-yellow text-black' : 'bg-ub-cool-grey text-white'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            )}
          </div>
          <div
            className="overflow-auto max-h-60"
            ref={scrollContainerRef}
            onScroll={(e) => {
              scrollPosition.current = (e.target as HTMLDivElement).scrollTop;
            }}
          >
            <table className="w-full text-left">
              <thead>
                <tr>
                  {keys.map((k) => (
                    <th key={k} className="border px-1">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr key={i}>
                    {keys.map((k) => (
                      <td key={k} className="border px-1">
                        {String(row[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'chart' && (
        <svg width="100%" height="100" role="img" aria-label="bar chart">
          {data.slice(0, keys.length).map((row, i) => (
            <rect
              key={i}
              x={i * 40}
              y={100 - Number(row[keys[0]])}
              width={30}
              height={Number(row[keys[0]])}
              fill={['#377eb8', '#4daf4a', '#e41a1c', '#984ea3', '#ff7f00'][i % 5]}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

