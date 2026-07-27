'use client';

import React, { useEffect, useMemo, useState } from 'react';

import copyToClipboard from '../../utils/clipboard';
import {
  getDiffWorkerPool,
  runDiff,
  type DiffMode,
  type DiffResult,
  type DiffSegment,
  type JsonDiffEntry,
} from '../../utils/diff';

const cx = (...values: Array<string | undefined | null | false>) => values.filter(Boolean).join(' ');

export interface DiffViewProps {
  left: unknown;
  right: unknown;
  mode?: DiffMode;
  className?: string;
  leftLabel?: string;
  rightLabel?: string;
  onResolve?: (selection: 'left' | 'right', value: unknown) => void;
}

const toCopyString = (mode: DiffMode, value: unknown): string => {
  if (mode === 'text') {
    return typeof value === 'string' ? value : String(value ?? '');
  }
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const createPayload = (
  mode: DiffMode,
  left: unknown,
  right: unknown,
): { left: unknown; right: unknown } => {
  if (mode === 'text') {
    return {
      left: typeof left === 'string' ? left : String(left ?? ''),
      right: typeof right === 'string' ? right : String(right ?? ''),
    };
  }
  if (mode === 'array') {
    return {
      left: Array.isArray(left) ? left : [],
      right: Array.isArray(right) ? right : [],
    };
  }
  return { left, right };
};

const pathToString = (path: Array<string | number>): string => {
  if (path.length === 0) return '(root)';
  return path
    .map((segment, index) => {
      if (typeof segment === 'number') {
        return `[${segment}]`;
      }
      return index === 0 ? segment : `.${segment}`;
    })
    .join('');
};

const stringifyValue = (value: unknown): string => {
  if (value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const segmentClass = (segment: DiffSegment) => {
  switch (segment.type) {
    case 'insert':
      return 'bg-emerald-500/20 text-emerald-200';
    case 'delete':
      return 'bg-rose-500/20 text-rose-200';
    default:
      return 'text-slate-200';
  }
};

const changeClass = (change: JsonDiffEntry) => {
  switch (change.kind) {
    case 'added':
      return 'border-l-4 border-emerald-500/70 bg-emerald-500/10 text-emerald-100';
    case 'removed':
      return 'border-l-4 border-rose-500/70 bg-rose-500/10 text-rose-100';
    case 'changed':
      return 'border-l-4 border-amber-500/70 bg-amber-500/10 text-amber-100';
    default:
      return 'border-l-4 border-slate-700 bg-slate-800/60 text-slate-300';
  }
};

const summaryLabel = (result: DiffResult): string => {
  if (result.kind === 'text') {
    let insertions = 0;
    let deletions = 0;
    result.segments.forEach(segment => {
      if (segment.type === 'insert') insertions += segment.text.length;
      if (segment.type === 'delete') deletions += segment.text.length;
    });
    return `+${insertions} / -${deletions} chars`;
  }
  const additions = result.changes.filter(change => change.kind === 'added').length;
  const removals = result.changes.filter(change => change.kind === 'removed').length;
  const modifications = result.changes.filter(change => change.kind === 'changed').length;
  return `Δ ${modifications} • +${additions} • -${removals}`;
};

const DiffView: React.FC<DiffViewProps> = ({
  left,
  right,
  mode,
  className,
  leftLabel = 'Left',
  rightLabel = 'Right',
  onResolve,
}) => {
  const resolvedMode: DiffMode = useMemo(() => {
    if (mode) return mode;
    if (typeof left === 'string' && typeof right === 'string') return 'text';
    if (Array.isArray(left) && Array.isArray(right)) return 'array';
    return 'json';
  }, [mode, left, right]);

  const [result, setResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    setCopied(null);
  }, [left, right]);

  useEffect(() => {
    const payload = createPayload(resolvedMode, left, right);
    const pool = getDiffWorkerPool();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    setLoading(true);
    setError(null);

    if (!pool) {
      try {
        const synchronous = runDiff(resolvedMode, payload as never);
        setResult(synchronous);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to compute diff');
        setResult(null);
      } finally {
        setLoading(false);
      }
      return () => undefined;
    }

    pool
      .run(resolvedMode, payload as never, controller?.signal)
      .then(setResult)
      .catch(err => {
        if (err && typeof err === 'object' && (err as Error).name === 'AbortError') {
          return;
        }
        try {
          const synchronous = runDiff(resolvedMode, payload as never);
          setResult(synchronous);
          setError(null);
        } catch (syncError) {
          setResult(null);
          setError(syncError instanceof Error ? syncError.message : 'Unable to compute diff');
        }
      })
      .finally(() => setLoading(false));

    return () => {
      controller?.abort();
    };
  }, [left, right, resolvedMode]);

  const handleCopy = async (side: 'left' | 'right') => {
    const source = side === 'left' ? left : right;
    const ok = await copyToClipboard(toCopyString(resolvedMode, source));
    setCopied(ok ? side : null);
    if (ok) {
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleResolve = (side: 'left' | 'right') => {
    if (!onResolve) return;
    const value = side === 'left' ? left : right;
    onResolve(side, value);
  };

  const renderTextDiff = (segments: DiffSegment[]) => (
    <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">
      {segments.map((segment, index) => (
        <span key={`${segment.type}-${index}`} className={segmentClass(segment)}>
          {segment.text}
        </span>
      ))}
    </pre>
  );

  const renderStructuredDiff = (changes: JsonDiffEntry[]) => (
    <div className="max-h-96 overflow-auto rounded-md border border-slate-700/70 bg-slate-900/60">
      <table className="w-full table-fixed text-left text-xs md:text-sm">
        <thead className="sticky top-0 bg-slate-900/95 text-slate-300">
          <tr>
            <th className="w-1/4 px-3 py-2">Path</th>
            <th className="w-1/4 px-3 py-2">Before</th>
            <th className="w-1/4 px-3 py-2">After</th>
            <th className="w-1/4 px-3 py-2">Kind</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, index) => (
            <tr key={`${change.kind}-${index}`} className={cx('align-top transition-colors', changeClass(change))}>
              <td className="px-3 py-2 font-mono">{pathToString(change.path)}</td>
              <td className="px-3 py-2 whitespace-pre-wrap font-mono">{stringifyValue(change.before)}</td>
              <td className="px-3 py-2 whitespace-pre-wrap font-mono">{stringifyValue(change.after)}</td>
              <td className="px-3 py-2 capitalize">{change.kind}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={cx('rounded-lg border border-slate-700/70 bg-slate-950/70 p-4 text-slate-100 backdrop-blur', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {loading ? 'Computing diff…' : result ? `Mode: ${resolvedMode}` : 'Diff'}
          {result ? ` · ${summaryLabel(result)}` : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopy('left')}
            className={cx(
              'rounded border border-slate-600 px-3 py-1 text-xs uppercase tracking-wide transition-colors hover:border-emerald-400 hover:text-emerald-200',
              copied === 'left' ? 'border-emerald-400 text-emerald-200' : 'text-slate-300',
            )}
          >
            {copied === 'left' ? 'Copied' : `Copy ${leftLabel}`}
          </button>
          <button
            type="button"
            onClick={() => handleCopy('right')}
            className={cx(
              'rounded border border-slate-600 px-3 py-1 text-xs uppercase tracking-wide transition-colors hover:border-emerald-400 hover:text-emerald-200',
              copied === 'right' ? 'border-emerald-400 text-emerald-200' : 'text-slate-300',
            )}
          >
            {copied === 'right' ? 'Copied' : `Copy ${rightLabel}`}
          </button>
          {onResolve ? (
            <>
              <button
                type="button"
                onClick={() => handleResolve('left')}
                className="rounded border border-slate-600 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 transition-colors hover:border-sky-400 hover:text-sky-200"
              >
                Use {leftLabel}
              </button>
              <button
                type="button"
                onClick={() => handleResolve('right')}
                className="rounded border border-slate-600 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 transition-colors hover:border-sky-400 hover:text-sky-200"
              >
                Use {rightLabel}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {!error && loading ? (
        <div className="animate-pulse rounded-md border border-slate-800/80 bg-slate-900/80 p-6 text-center text-sm text-slate-400">
          Processing diff…
        </div>
      ) : null}
      {!error && !loading && result ? (
        <div className="space-y-3">
          {result.kind === 'text'
            ? renderTextDiff(result.segments)
            : renderStructuredDiff(result.changes)}
        </div>
      ) : null}
    </div>
  );
};

export default DiffView;
