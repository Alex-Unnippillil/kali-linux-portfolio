'use client';

import React, { useEffect } from 'react';
import { createLogger, type Logger } from '../../lib/logger';
import type { UndoConflict } from '../../src/undo/types';

interface UndoConflictDialogProps {
  conflict: UndoConflict | null;
  onResolve: () => void;
  onRetry?: () => void;
  logger?: Logger;
}

const UndoConflictDialog: React.FC<UndoConflictDialogProps> = ({
  conflict,
  onResolve,
  onRetry,
  logger = createLogger(),
}) => {
  useEffect(() => {
    if (!conflict) return;
    logger.warn('Undo conflict encountered', {
      entryId: conflict.entryId,
      message: conflict.message,
      blockingEntryIds: conflict.blockingEntries.map(entry => entry.id),
    });
  }, [conflict, logger]);

  if (!conflict) {
    return null;
  }

  const handleResolve = () => {
    logger.info('Undo conflict dismissed', { entryId: conflict.entryId });
    onResolve();
  };

  const handleRetry = () => {
    logger.info('Undo conflict retry requested', { entryId: conflict.entryId });
    onRetry?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="undo-conflict-title"
      aria-describedby="undo-conflict-message"
    >
      <div className="w-full max-w-md overflow-hidden rounded border border-gray-700 bg-ub-cool-grey text-white shadow-xl">
        <div className="border-b border-gray-700 px-4 py-3">
          <h2 id="undo-conflict-title" className="text-lg font-semibold">
            Undo Conflict
          </h2>
          <p className="mt-1 text-xs text-gray-300">
            {conflict.entryLabel} could not be undone.
          </p>
        </div>
        <div className="space-y-3 px-4 py-3">
          <p id="undo-conflict-message" className="text-sm text-gray-100">
            {conflict.message}
          </p>
          {conflict.blockingEntries.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                Blocking changes
              </h3>
              <ul className="mt-2 space-y-1" aria-label="Blocking entries">
                {conflict.blockingEntries.map(blocking => (
                  <li
                    key={blocking.id}
                    className="rounded border border-gray-700 bg-black bg-opacity-40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{blocking.label}</span>
                    <span className="ml-2 text-xs text-gray-400">#{blocking.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-700 px-4 py-3">
          {onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={handleResolve}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default UndoConflictDialog;
