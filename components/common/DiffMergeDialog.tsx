'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Modal from '../base/Modal';
import {
  DiffHunk,
  HunkSelection,
  computeDiffHunks,
  mergeDiffHunks,
  summarizeSelections,
} from '../../utils/diffMerge';

type Logger = (event: string, payload: Record<string, unknown>) => void;

export interface DiffMergeDialogProps {
  isOpen: boolean;
  title?: string;
  baseContent: string;
  incomingContent: string;
  entityLabel?: string;
  source?: string;
  leftLabel?: string;
  rightLabel?: string;
  logger?: Logger;
  onClose: () => void;
  onApply: (
    merged: string,
    meta: {
      selection: Record<string, HunkSelection>;
      hunks: number;
      manualEdits: boolean;
    },
  ) => void;
}

const defaultLogger: Logger = (event, payload) => {
  if (typeof console !== 'undefined' && console.info) {
    console.info(`[diff-merge] ${event}`, payload);
  }
};

const lineClass = (type: DiffHunk['lines'][number]['type']) => {
  if (type === 'add') return 'bg-green-500/20 text-emerald-200';
  if (type === 'remove') return 'bg-red-500/20 text-rose-200';
  return 'text-gray-100';
};

const formatLabel = (prefix: string, fallback: string) =>
  prefix ? `${prefix}` : fallback;

const DiffMergeDialog: React.FC<DiffMergeDialogProps> = ({
  isOpen,
  title = 'Resolve Conflict',
  baseContent,
  incomingContent,
  entityLabel,
  source,
  leftLabel,
  rightLabel,
  logger = defaultLogger,
  onClose,
  onApply,
}) => {
  const [hunks, setHunks] = useState<DiffHunk[]>([]);
  const [selection, setSelection] = useState<Record<string, HunkSelection>>({});
  const [preview, setPreview] = useState('');
  const [manualEdits, setManualEdits] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextHunks = computeDiffHunks(baseContent, incomingContent);
    const initialSelection: Record<string, HunkSelection> = {};
    nextHunks.forEach((hunk) => {
      initialSelection[hunk.id] = 'incoming';
    });
    setHunks(nextHunks);
    setSelection(initialSelection);
    setPreview(mergeDiffHunks(baseContent, incomingContent, nextHunks, initialSelection));
    setManualEdits(false);
    logger('dialog-opened', {
      source,
      entity: entityLabel,
      hunks: nextHunks.length,
    });
  }, [isOpen, baseContent, incomingContent, logger, source, entityLabel]);

  useEffect(() => {
    if (!isOpen) return;
    if (manualEdits) return;
    setPreview(mergeDiffHunks(baseContent, incomingContent, hunks, selection));
  }, [
    isOpen,
    manualEdits,
    baseContent,
    incomingContent,
    hunks,
    selection,
  ]);

  const handleSelectionChange = useCallback(
    (hunkId: string, value: HunkSelection) => {
      setSelection((prev) => {
        const next = { ...prev, [hunkId]: value };
        logger('hunk-selection', {
          hunkId,
          selection: value,
          source,
          entity: entityLabel,
        });
        return next;
      });
      setManualEdits(false);
    },
    [logger, source, entityLabel],
  );

  const mergedSummary = useMemo(
    () => summarizeSelections(hunks, selection),
    [hunks, selection],
  );

  const handleApply = useCallback(() => {
    logger('merge-applied', {
      source,
      entity: entityLabel,
      ...mergedSummary,
      manualEdits,
    });
    onApply(preview, {
      selection,
      hunks: hunks.length,
      manualEdits,
    });
  }, [
    logger,
    source,
    entityLabel,
    mergedSummary,
    manualEdits,
    onApply,
    preview,
    selection,
    hunks.length,
  ]);

  const handleClose = useCallback(() => {
    logger('merge-cancelled', { source, entity: entityLabel });
    onClose();
  }, [logger, source, entityLabel, onClose]);

  const localLabel = formatLabel(leftLabel ?? '', 'Current value');
  const remoteLabel = formatLabel(rightLabel ?? '', 'Incoming change');

  const renderColumn = (
    hunk: DiffHunk,
    column: 'old' | 'new',
  ) => {
    const relevant = hunk.lines.filter((line) => {
      if (column === 'old') {
        return line.type === 'context' || line.type === 'remove';
      }
      return line.type === 'context' || line.type === 'add';
    });
    return (
      <div className="flex-1">
        <div className="text-sm font-semibold mb-2" data-testid={`column-label-${column}`}>
          {column === 'old' ? localLabel : remoteLabel}
        </div>
        <div
          className="bg-black/60 rounded border border-white/10 overflow-auto max-h-56"
          aria-label={column === 'old' ? localLabel : remoteLabel}
          role="grid"
        >
          <table className="w-full text-xs font-mono">
            <tbody>
              {relevant.map((line, idx) => (
                <tr key={`${line.type}-${idx}`}>
                  <td className="w-12 px-2 text-right text-gray-400 align-top" aria-hidden>
                    {column === 'old' ? line.oldNumber ?? '' : line.newNumber ?? ''}
                  </td>
                  <td
                    className={`px-2 whitespace-pre-wrap align-top ${lineClass(
                      line.type,
                    )}`}
                  >
                    {line.content || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div
          role="document"
          aria-label={title}
          className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg bg-slate-900 text-gray-100 shadow-xl border border-white/10"
        >
          <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
            <div>
              <h2 className="text-lg font-semibold" data-testid="dialog-title">
                {title}
              </h2>
              {entityLabel && (
                <p className="text-sm text-gray-300" data-testid="conflict-entity">
                  {entityLabel}
                </p>
              )}
              {source && (
                <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">
                  {source}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Close
            </button>
          </header>

          <div className="flex flex-col gap-4 overflow-y-auto p-4" aria-live="polite">
            {hunks.length === 0 ? (
              <p className="text-sm text-gray-300" data-testid="no-diff">
                No differences detected. You can apply the current preview to continue.
              </p>
            ) : (
              hunks.map((hunk, index) => (
                <fieldset
                  key={hunk.id}
                  className="space-y-3 rounded border border-white/10 bg-white/5 p-3"
                >
                  <legend className="px-1 text-sm font-semibold">
                    Change {index + 1} of {hunks.length}
                  </legend>
                  <div className="flex flex-col gap-3 md:flex-row">
                    {renderColumn(hunk, 'old')}
                    {renderColumn(hunk, 'new')}
                  </div>
                  <div className="flex flex-wrap gap-4" role="radiogroup">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`selection-${hunk.id}`}
                        value="base"
                        checked={(selection[hunk.id] ?? 'incoming') === 'base'}
                        onChange={() => handleSelectionChange(hunk.id, 'base')}
                      />
                      Keep current value
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`selection-${hunk.id}`}
                        value="incoming"
                        checked={(selection[hunk.id] ?? 'incoming') === 'incoming'}
                        onChange={() => handleSelectionChange(hunk.id, 'incoming')}
                      />
                      Accept incoming change
                    </label>
                  </div>
                </fieldset>
              ))
            )}
          </div>

          <footer className="space-y-3 border-t border-white/10 p-4">
            <div>
              <label htmlFor="merge-preview" className="block text-sm font-semibold">
                Merged preview
              </label>
              <textarea
                id="merge-preview"
                value={preview}
                onChange={(event) => {
                  setManualEdits(true);
                  setPreview(event.target.value);
                  logger('preview-edited', {
                    source,
                    entity: entityLabel,
                  });
                }}
                rows={8}
                className="mt-1 w-full resize-y rounded border border-white/10 bg-black/60 p-3 font-mono text-sm text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              />
              <p className="mt-1 text-xs text-gray-400">
                {mergedSummary.totalHunks} changes total · keeping {mergedSummary.baseSelections} current, accepting {mergedSummary.incomingSelections} incoming.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
              >
                Apply resolution
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Modal>
  );
};

export default DiffMergeDialog;

