'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  buildDiff,
  collectDiffStats,
  countNodes,
  flattenDiff,
  normalizeTree,
  type DiffNode,
  type DiffStats,
  type DirEntry,
} from './dirDiffUtils';

const DEFAULT_WORKER_THRESHOLD = 10_000;

type TreeSide = 'left' | 'right';

type DisplayStatus = 'added' | 'removed' | 'changed' | 'unchanged' | 'missing';

const statusLabels: Record<DisplayStatus, string> = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Changed',
  unchanged: 'Unchanged',
  missing: 'Missing',
};

const statusBadgeStyles: Record<DisplayStatus, string> = {
  added: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  removed: 'bg-rose-100 text-rose-800 border border-rose-200',
  changed: 'bg-amber-100 text-amber-800 border border-amber-200',
  missing: 'bg-slate-100 text-slate-500 border border-slate-200',
  unchanged: 'bg-slate-100 text-slate-500 border border-transparent',
};

const rowHighlightStyles: Record<DisplayStatus, string> = {
  added: 'bg-emerald-50',
  removed: 'bg-rose-50',
  changed: 'bg-amber-50',
  missing: 'opacity-60 italic',
  unchanged: '',
};

export interface DirDiffProps {
  left: DirEntry | null | undefined;
  right: DirEntry | null | undefined;
  leftLabel?: string;
  rightLabel?: string;
  workerThreshold?: number;
  className?: string;
}

type WorkerMessage = {
  diff: DiffNode | null;
  stats: DiffStats;
  error?: string;
};

const EMPTY_STATS = collectDiffStats(null);

function highlightMatch(value: string, query: string): React.ReactNode {
  if (!query) return value;
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerValue.indexOf(lowerQuery);
  if (index === -1) return value;
  const end = index + query.length;
  return (
    <>
      {value.slice(0, index)}
      <mark className="rounded bg-yellow-200 px-0.5 text-yellow-900">
        {value.slice(index, end)}
      </mark>
      {value.slice(end)}
    </>
  );
}

function collectDirectoryPaths(node: DiffNode, acc: Set<string>): void {
  if (node.type === 'directory') {
    acc.add(node.path);
    node.children.forEach((child) => collectDirectoryPaths(child, acc));
  }
}

function collectChangedDirectories(node: DiffNode, acc: Set<string>): void {
  if (node.type === 'directory') {
    if (node.status !== 'unchanged') {
      acc.add(node.path);
    }
    node.children.forEach((child) => collectChangedDirectories(child, acc));
  }
}

function filterTree(node: DiffNode, query: string): DiffNode | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return node;
  const matchesSelf =
    node.name.toLowerCase().includes(normalized) ||
    node.path.toLowerCase().includes(normalized);
  const filteredChildren = node.children
    .map((child) => filterTree(child, query))
    .filter((child): child is DiffNode => Boolean(child));
  if (matchesSelf || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
    };
  }
  return null;
}

function getDisplayStatus(node: DiffNode, side: TreeSide): DisplayStatus {
  if (side === 'left') {
    if (!node.left && node.right) {
      return 'missing';
    }
    if (node.status === 'removed') {
      return 'removed';
    }
  } else {
    if (!node.right && node.left) {
      return 'missing';
    }
    if (node.status === 'added') {
      return 'added';
    }
  }
  if (node.status === 'changed') {
    return 'changed';
  }
  return 'unchanged';
}

export default function DirDiff({
  left,
  right,
  leftLabel = 'Original',
  rightLabel = 'Modified',
  workerThreshold = DEFAULT_WORKER_THRESHOLD,
  className,
}: DirDiffProps) {
  const [diff, setDiff] = useState<DiffNode | null>(null);
  const [stats, setStats] = useState<DiffStats>({ ...EMPTY_STATS });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const workerRef = useRef<Worker | null>(null);

  const normalizedLeft = useMemo(() => (left ? normalizeTree(left) : null), [left]);
  const normalizedRight = useMemo(() => (right ? normalizeTree(right) : null), [right]);
  const totalNodes = useMemo(
    () => countNodes(normalizedLeft) + countNodes(normalizedRight),
    [normalizedLeft, normalizedRight]
  );
  const canUseWorker = typeof window !== 'undefined' && typeof Worker !== 'undefined';
  const shouldUseWorker = canUseWorker && totalNodes >= workerThreshold;

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!normalizedLeft && !normalizedRight) {
      setDiff(null);
      setStats({ ...EMPTY_STATS });
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    if (shouldUseWorker) {
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('./dirDiff.worker.ts', import.meta.url));
      }
      const worker = workerRef.current;

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        if (cancelled) return;
        const payload = event.data;
        if (!payload) return;
        if (payload.error) {
          setError(payload.error);
          setDiff(null);
          setStats({ ...EMPTY_STATS });
          setLoading(false);
          return;
        }
        setDiff(payload.diff);
        setStats(payload.stats ?? { ...EMPTY_STATS });
        setLoading(false);
      };

      const handleError = (event: ErrorEvent) => {
        if (cancelled) return;
        setError(event.message || 'Failed to compute directory diff');
        setDiff(null);
        setStats({ ...EMPTY_STATS });
        setLoading(false);
      };

      worker.onmessage = handleMessage;
      worker.onerror = handleError;
      worker.postMessage({ left: normalizedLeft, right: normalizedRight });

      return () => {
        cancelled = true;
        if (worker.onmessage === handleMessage) {
          worker.onmessage = null;
        }
        if (worker.onerror === handleError) {
          worker.onerror = null;
        }
      };
    }

    try {
      const diffResult = buildDiff(normalizedLeft, normalizedRight);
      const diffStats = collectDiffStats(diffResult);
      if (!cancelled) {
        setDiff(diffResult);
        setStats(diffStats);
        setLoading(false);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : String(err));
        setDiff(null);
        setStats({ ...EMPTY_STATS });
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [normalizedLeft, normalizedRight, shouldUseWorker, workerThreshold, totalNodes]);

  useEffect(() => {
    if (!diff) {
      setExpandedPaths(new Set());
      return;
    }
    setExpandedPaths(new Set([diff.path]));
  }, [diff]);

  const filterQuery = filter.trim();

  const filteredDiff = useMemo(() => {
    if (!diff) return null;
    if (!filterQuery) return diff;
    return filterTree(diff, filterQuery);
  }, [diff, filterQuery]);

  useEffect(() => {
    if (!filteredDiff) {
      setExpandedPaths(new Set());
      return;
    }
    if (!filterQuery) {
      setExpandedPaths(new Set([filteredDiff.path]));
      return;
    }
    const paths = new Set<string>();
    collectDirectoryPaths(filteredDiff, paths);
    setExpandedPaths(paths);
  }, [filteredDiff, filterQuery]);

  const displayDiff = filteredDiff;

  const toggleNode = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!diff) return;
    const paths = new Set<string>();
    collectDirectoryPaths(diff, paths);
    setExpandedPaths(paths);
  }, [diff]);

  const expandChanges = useCallback(() => {
    if (!diff) return;
    const paths = new Set<string>();
    collectChangedDirectories(diff, paths);
    if (diff.type === 'directory') {
      paths.add(diff.path);
    }
    setExpandedPaths(paths);
  }, [diff]);

  const collapseAll = useCallback(() => {
    if (!diff) {
      setExpandedPaths(new Set());
      return;
    }
    setExpandedPaths(new Set([diff.path]));
  }, [diff]);

  const download = useCallback((filename: string, contents: string, mime: string) => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const exportReport = useCallback(
    (format: 'json' | 'markdown') => {
      if (!diff) return;
      const rows = flattenDiff(diff);
      if (format === 'json') {
        const payload = {
          generatedAt: new Date().toISOString(),
          stats,
          entries: rows,
        };
        download('dir-diff-report.json', JSON.stringify(payload, null, 2), 'application/json');
        return;
      }
      const lines: string[] = [];
      lines.push('# Directory Diff Report');
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push('');
      lines.push('## Summary');
      lines.push(`- Added: ${stats.added}`);
      lines.push(`- Removed: ${stats.removed}`);
      lines.push(`- Changed: ${stats.changed}`);
      lines.push(`- Unchanged: ${stats.unchanged}`);
      lines.push(`- Total: ${stats.total}`);
      lines.push('');
      lines.push('## Details');
      lines.push('| Status | Path | Left Type | Right Type | Left Size | Right Size |');
      lines.push('| ------ | ---- | --------- | ---------- | --------- | ---------- |');
      rows.forEach((row) => {
        lines.push(
          `| ${row.status} | ${row.path} | ${row.leftType ?? ''} | ${row.rightType ?? ''} | ${
            row.leftSize ?? ''
          } | ${row.rightSize ?? ''} |`
        );
      });
      download('dir-diff-report.md', lines.join('\n'), 'text/markdown');
    },
    [diff, download, stats]
  );

  const renderNode = useCallback(
    (node: DiffNode, side: TreeSide, depth = 0): React.ReactNode => {
      const isDirectory = node.type === 'directory';
      const expanded = expandedPaths.has(node.path);
      const hasChildren = node.children.length > 0;
      const displayStatus = getDisplayStatus(node, side);
      const isPresent = side === 'left' ? Boolean(node.left) : Boolean(node.right);
      const displayName = side === 'left' ? node.left?.name ?? node.name : node.right?.name ?? node.name;

      return (
        <li key={`${side}-${node.path}`} className="space-y-1">
          <div
            className={`flex items-start gap-2 rounded pr-2 text-sm ${rowHighlightStyles[displayStatus]}`.trim()}
            style={{ paddingLeft: depth * 16 }}
          >
            {isDirectory ? (
              <button
                type="button"
                onClick={() => toggleNode(node.path)}
                className="mt-0.5 flex h-5 w-5 items-center justify-center rounded text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none"
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
              >
                {expanded ? '▾' : '▸'}
              </button>
            ) : (
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center text-xs text-slate-400">•</span>
            )}
            <span
              className={`mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeStyles[displayStatus]}`}
            >
              {statusLabels[displayStatus]}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={`font-mono text-xs ${
                  isPresent ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 italic'
                }`}
                title={node.path}
              >
                {highlightMatch(displayName, filterQuery)}
              </div>
              <div className="text-[10px] text-slate-400">{highlightMatch(node.path, filterQuery)}</div>
            </div>
          </div>
          {isDirectory && expanded && hasChildren ? (
            <ul className="space-y-1 border-l border-slate-200 pl-2 dark:border-slate-700">
              {node.children.map((child) => renderNode(child, side, depth + 1))}
            </ul>
          ) : null}
        </li>
      );
    },
    [expandedPaths, filterQuery, toggleNode]
  );

  const renderTree = useCallback(
    (tree: DiffNode | null, side: TreeSide) => {
      if (!tree) {
        return <p className="text-sm text-slate-500">No data available.</p>;
      }
      return <ul className="space-y-1">{renderNode(tree, side)}</ul>;
    },
    [renderNode]
  );

  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
      <div className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Added {stats.added}</span>
          <span className="rounded bg-rose-50 px-2 py-1 text-rose-700">Removed {stats.removed}</span>
          <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">Changed {stats.changed}</span>
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">Unchanged {stats.unchanged}</span>
          <span className="rounded bg-slate-200 px-2 py-1 text-slate-700">Total {stats.total}</span>
          {shouldUseWorker ? (
            <span className="ml-auto text-[10px] uppercase text-slate-400">
              Large dataset · processed in a background worker
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Collapse all
            </button>
            <button
              type="button"
              onClick={expandChanges}
              className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/20"
            >
              Expand changes
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative">
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter by name or path"
                aria-label="Filter diff entries"
                className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportReport('json')}
                className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => exportReport('markdown')}
                className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Export Markdown
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Computing directory diff...
        </div>
      ) : error ? (
        <div className="rounded border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      ) : displayDiff ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex h-full flex-col rounded border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
              <span>{leftLabel}</span>
            </div>
            <div className="mt-2 flex-1 overflow-auto pr-1 text-sm">
              {renderTree(displayDiff, 'left')}
            </div>
          </div>
          <div className="flex h-full flex-col rounded border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
              <span>{rightLabel}</span>
            </div>
            <div className="mt-2 flex-1 overflow-auto pr-1 text-sm">
              {renderTree(displayDiff, 'right')}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No matching entries found.
        </div>
      )}
    </div>
  );
}
