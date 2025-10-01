import React, { useMemo } from 'react';
import { createLineDiff, summarizeDiff, type DiffSegment } from '../../../utils/diffEngine';

interface DiffModalProps {
  open: boolean;
  baseContent: string;
  targetContent: string;
  baseLabel?: string;
  targetLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onRestore?: (content: string) => void;
}

const DiffModal: React.FC<DiffModalProps> = ({
  open,
  baseContent,
  targetContent,
  baseLabel = 'Original',
  targetLabel = 'Current',
  loading = false,
  onClose,
  onRestore,
}) => {
  const diffSegments = useMemo<DiffSegment[]>(
    () => (open && !loading ? createLineDiff(baseContent, targetContent) : []),
    [open, loading, baseContent, targetContent],
  );

  const summary = useMemo(() => summarizeDiff(diffSegments), [diffSegments]);

  if (!open) return null;

  const handleRestore = () => {
    if (!onRestore || loading) return;
    onRestore(baseContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-gray-900 text-white w-full max-w-4xl max-h-full overflow-hidden rounded shadow-lg border border-gray-700 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <div className="text-sm font-semibold">Compare versions</div>
            <div className="text-xs text-gray-400">
              {baseLabel} → {targetLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
            type="button"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-black bg-opacity-40 font-mono text-xs whitespace-pre-wrap break-words">
          {loading ? (
            <div className="text-gray-400">Loading diff…</div>
          ) : diffSegments.length === 0 ? (
            <div className="text-gray-400">No differences detected.</div>
          ) : (
            diffSegments.map((segment, index) => (
              <span
                key={`${segment.type}-${index}`}
                data-testid={`diff-${segment.type}`}
                className={
                  segment.type === 'added'
                    ? 'bg-green-800 bg-opacity-60 block'
                    : segment.type === 'removed'
                    ? 'bg-red-800 bg-opacity-60 line-through block'
                    : 'block'
                }
              >
                {segment.value}
              </span>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-700 bg-gray-900 text-xs">
          <button
            onClick={handleRestore}
            className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50"
            disabled={loading || !onRestore}
            type="button"
          >
            Restore this version
          </button>
          <div className="text-[10px] text-gray-400">
            +{summary.added} / -{summary.removed} / ={summary.unchanged}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffModal;
