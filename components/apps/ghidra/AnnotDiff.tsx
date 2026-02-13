import React, {
  useDeferredValue,
  useMemo,
  useState,
} from 'react';

export type AnnotationCategory = 'comments' | 'labels' | 'types';
export type DiffStatus = 'added' | 'removed' | 'changed';

export interface AnnotationSnapshot {
  id: string;
  name: string;
  createdAt: string;
  comments: Record<string, string>;
  labels: Record<string, string>;
  types: Record<string, string>;
}

type SnapshotMap = Pick<AnnotationSnapshot, AnnotationCategory>;

interface AnnotDiffProps {
  snapshots: AnnotationSnapshot[];
  baseSnapshotId: string | null;
  targetSnapshotId: string | null;
  onSelectBase: (id: string) => void;
  onSelectTarget: (id: string) => void;
}

interface DiffEntry {
  address: string;
  category: AnnotationCategory;
  status: DiffStatus;
  oldValue?: string;
  newValue?: string;
}

const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  comments: 'Comments',
  labels: 'Labels',
  types: 'Types',
};

const STATUS_STYLES: Record<DiffStatus, string> = {
  added: 'bg-green-900 text-green-100 border border-green-500/40',
  removed: 'bg-red-900 text-red-100 border border-red-500/40',
  changed: 'bg-yellow-900 text-yellow-100 border border-yellow-500/40',
};

const CATEGORY_COLORS: Record<AnnotationCategory, string> = {
  comments: 'bg-blue-900 text-blue-100 border border-blue-500/40',
  labels: 'bg-purple-900 text-purple-100 border border-purple-500/40',
  types: 'bg-teal-900 text-teal-100 border border-teal-500/40',
};

function normalizeAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('0x')) {
    const hex = lower.slice(2).replace(/[^0-9a-f]/g, '');
    if (!hex) return '0x0';
    return `0x${hex}`;
  }
  const hex = lower.replace(/[^0-9a-f]/g, '');
  if (!hex) return trimmed;
  return `0x${hex}`;
}

function parseAddress(address: string): number | null {
  const normalized = normalizeAddress(address);
  if (!normalized.startsWith('0x')) return null;
  const hex = normalized.slice(2);
  if (!hex) return null;
  const parsed = parseInt(hex, 16);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function collectDiff(
  base: AnnotationSnapshot | undefined,
  target: AnnotationSnapshot | undefined
): DiffEntry[] {
  if (!base && !target) return [];
  const entries: DiffEntry[] = [];

  (['comments', 'labels', 'types'] as AnnotationCategory[]).forEach(
    (category) => {
      const baseMap = base ? (base as SnapshotMap)[category] : {};
      const targetMap = target ? (target as SnapshotMap)[category] : {};
      const keys = new Set([
        ...Object.keys(baseMap || {}),
        ...Object.keys(targetMap || {}),
      ]);
      keys.forEach((addressKey) => {
        const normalizedAddress = normalizeAddress(addressKey);
        const oldValue = baseMap?.[addressKey];
        const newValue = targetMap?.[addressKey];
        if (oldValue === newValue) return;
        let status: DiffStatus = 'changed';
        if (typeof oldValue === 'undefined') {
          status = 'added';
        } else if (typeof newValue === 'undefined') {
          status = 'removed';
        }
        entries.push({
          address: normalizedAddress || addressKey,
          category,
          status,
          oldValue,
          newValue,
        });
      });
    }
  );

  return entries.sort((a, b) => {
    const aAddr = parseAddress(a.address) ?? Number.MAX_SAFE_INTEGER;
    const bAddr = parseAddress(b.address) ?? Number.MAX_SAFE_INTEGER;
    if (aAddr !== bAddr) return aAddr - bAddr;
    if (a.category !== b.category)
      return a.category.localeCompare(b.category);
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return (a.newValue || a.oldValue || '').localeCompare(
      b.newValue || b.oldValue || ''
    );
  });
}

function filterDiff(
  diff: DiffEntry[],
  filters: Record<AnnotationCategory, boolean>,
  search: string,
  rangeStart: string,
  rangeEnd: string
): DiffEntry[] {
  const normalizedStart = normalizeAddress(rangeStart);
  const normalizedEnd = normalizeAddress(rangeEnd);
  const startValue = parseAddress(normalizedStart);
  const endValue = parseAddress(normalizedEnd);
  const hasRange =
    typeof startValue === 'number' || typeof endValue === 'number';
  const loweredSearch = search.trim().toLowerCase();

  return diff.filter((entry) => {
    if (!filters[entry.category]) return false;

    if (hasRange) {
      const addrValue = parseAddress(entry.address);
      if (addrValue === null) return false;
      if (
        typeof startValue === 'number' &&
        addrValue < startValue
      ) {
        return false;
      }
      if (
        typeof endValue === 'number' &&
        addrValue > endValue
      ) {
        return false;
      }
    }

    if (!loweredSearch) return true;
    const haystack = `${entry.address} ${entry.oldValue || ''} ${
      entry.newValue || ''
    }`.toLowerCase();
    return haystack.includes(loweredSearch);
  });
}

const AnnotDiff: React.FC<AnnotDiffProps> = ({
  snapshots,
  baseSnapshotId,
  targetSnapshotId,
  onSelectBase,
  onSelectTarget,
}) => {
  const [filters, setFilters] = useState<Record<AnnotationCategory, boolean>>({
    comments: true,
    labels: true,
    types: true,
  });
  const [search, setSearch] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const baseSnapshot = useMemo(
    () => snapshots.find((snap) => snap.id === baseSnapshotId),
    [snapshots, baseSnapshotId]
  );
  const targetSnapshot = useMemo(
    () => snapshots.find((snap) => snap.id === targetSnapshotId),
    [snapshots, targetSnapshotId]
  );

  const diff = useMemo(
    () => collectDiff(baseSnapshot, targetSnapshot),
    [baseSnapshot, targetSnapshot]
  );
  const deferredDiff = useDeferredValue(diff);

  const filteredDiff = useMemo(
    () => filterDiff(deferredDiff, filters, search, rangeStart, rangeEnd),
    [deferredDiff, filters, search, rangeStart, rangeEnd]
  );

  const summary = useMemo(() => {
    return filteredDiff.reduce(
      (acc, entry) => {
        acc[entry.status] += 1;
        return acc;
      },
      { added: 0, removed: 0, changed: 0 }
    );
  }, [filteredDiff]);

  const handleToggleFilter = (category: AnnotationCategory) => {
    setFilters((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleClearFilters = () => {
    setFilters({ comments: true, labels: true, types: true });
    setSearch('');
    setRangeStart('');
    setRangeEnd('');
  };

  const handleExport = () => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !targetSnapshot ||
      filteredDiff.length === 0
    ) {
      return;
    }
    const payload = {
      generatedAt: new Date().toISOString(),
      baseSnapshot: baseSnapshot
        ? { id: baseSnapshot.id, name: baseSnapshot.name }
        : null,
      targetSnapshot: {
        id: targetSnapshot.id,
        name: targetSnapshot.name,
      },
      filters,
      search,
      range: {
        start: rangeStart || null,
        end: rangeEnd || null,
      },
      diff: filteredDiff,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = targetSnapshot.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    link.href = url;
    link.download = `${baseName || 'snapshot'}-diff.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col text-xs">
          <span className="mb-1 font-semibold uppercase tracking-wide text-gray-300">
            Base snapshot
          </span>
          <select
            className="rounded bg-gray-800 p-2 text-gray-100"
            value={baseSnapshotId || ''}
            onChange={(e) => onSelectBase(e.target.value)}
          >
            <option value="">None</option>
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          <span className="mb-1 font-semibold uppercase tracking-wide text-gray-300">
            Target snapshot
          </span>
          <select
            className="rounded bg-gray-800 p-2 text-gray-100"
            value={targetSnapshotId || ''}
            onChange={(e) => onSelectTarget(e.target.value)}
          >
            <option value="">None</option>
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(CATEGORY_LABELS) as AnnotationCategory[]).map(
          (category) => (
            <label
              key={category}
              className={`flex items-center gap-1 rounded px-2 py-1 cursor-pointer border ${
                filters[category]
                  ? 'border-blue-500/40 bg-gray-800 text-gray-100'
                  : 'border-gray-700 bg-gray-900 text-gray-400'
              }`}
            >
              <input
                type="checkbox"
                className="accent-blue-500"
                checked={filters[category]}
                onChange={() => handleToggleFilter(category)}
                aria-label={`${CATEGORY_LABELS[category]} filter toggle`}
              />
              {CATEGORY_LABELS[category]}
            </label>
          )
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-4 text-xs">
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-300">Start address</span>
          <input
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="rounded bg-gray-800 p-2 text-gray-100"
            placeholder="0x401000"
            aria-label="Filter start address"
          />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-300">End address</span>
          <input
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="rounded bg-gray-800 p-2 text-gray-100"
            placeholder="0x4010ff"
            aria-label="Filter end address"
          />
        </label>
        <label className="flex flex-col md:col-span-2">
          <span className="mb-1 font-semibold text-gray-300">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded bg-gray-800 p-2 text-gray-100"
            placeholder="Search address or text"
            aria-label="Search annotations"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className="rounded bg-gray-800 px-3 py-1 hover:bg-gray-700"
          onClick={handleClearFilters}
        >
          Clear filters
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1 ${
            filteredDiff.length === 0
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-700 text-white hover:bg-blue-600'
          }`}
          onClick={handleExport}
          disabled={filteredDiff.length === 0}
        >
          Export diff report
        </button>
        <div className="ml-auto flex items-center gap-2 text-gray-300">
          <span>Δ Added: {summary.added}</span>
          <span>Removed: {summary.removed}</span>
          <span>Changed: {summary.changed}</span>
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded border border-gray-700 bg-gray-900 text-xs md:text-sm">
        {filteredDiff.length === 0 ? (
          <div className="p-4 text-gray-400">
            No differences for the selected snapshots and filters.
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {filteredDiff.map((entry) => (
              <li key={`${entry.category}-${entry.address}-${entry.status}-${entry.newValue || entry.oldValue}`}
                className="p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-yellow-100">
                    {entry.address}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${CATEGORY_COLORS[entry.category]}`}>
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${STATUS_STYLES[entry.status]}`}>
                    {entry.status}
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase text-gray-400">Base</div>
                    <div className="rounded bg-gray-800 p-2 text-gray-200 whitespace-pre-wrap break-words min-h-[2.5rem]">
                      {entry.oldValue ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-gray-400">Target</div>
                    <div className="rounded bg-gray-800 p-2 text-gray-200 whitespace-pre-wrap break-words min-h-[2.5rem]">
                      {entry.newValue ?? '—'}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AnnotDiff;
